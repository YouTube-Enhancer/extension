import browser from "webextension-polyfill";

import type {
	CoreFeatureKeys,
	FeatureKeys,
	FeatureKeysWithState,
	FeatureState,
	NonFeatureKeys
} from "@/src/features/_registry/types";
import type {
	configuration,
	ContentSendOnlyMessages,
	ContentToBackgroundSendOnlyMessages,
	ExtensionSendOnlyMessageMappings,
	Messages,
	Nullable,
	Path,
	PathValue,
	StorageChanges
} from "@/src/types";

import { isFeatureKey, resolveEnabled } from "@/src/features/_registry/featureRegistryCore";
import { featureLightStateFeatureIds } from "@/src/features/_registry/generatedFeatureLightManifest";
import { videoHistoryEntrySchema } from "@/src/features/videoHistory/index.metadata";
import { startDevelopmentMode } from "@/src/pages/content/development";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { DEV_MODE } from "@/src/utils/config/env";
import { deepMerge, parseStoredValue } from "@/src/utils/config/utils";
import { deepEqual } from "@/src/utils/deepEqual";
import { waitForReady } from "@/src/utils/embedded/instanceLiveness";
import {
	MESSAGE_ORIGIN,
	sendExtensionMessage,
	sendExtensionOnlyMessage
} from "@/src/utils/messaging";
import { getCurrentVideoId } from "@/src/utils/url";

// Polyfill may return Chrome's native (partial) browser API which can lack storage.
const storage = browser.storage ?? chrome.storage;
const defaultConfiguration = getDefaultConfiguration();
const defaultConfigKeys = Object.keys(defaultConfiguration);
/** Upper bound on a single page-originated feature-state write (roughly a quarter of the storage quota). */
const MAX_STATE_JSON_BYTES = 100_000;
/** videoHistory entries kept in storage; the oldest beyond this are pruned on write. */
const MAX_HISTORY_ENTRIES = 1000;
/**
 * The content script applies the feature's own stateSchema (exported by its
 * index.metadata.ts) at the page-facing write boundary, and hydration applies the same schema
 * again inside the page-world registry. Without the write-boundary check a page-planted invalid
 * entry would fail every hydration while the merge path kept re-storing it forever.
 */
const isValidVideoHistoryEntry = (value: unknown): boolean =>
	videoHistoryEntrySchema.safeParse(value).success;
/**
 * Adds a script element to the document's root element, which loads a JavaScript file from the extension's runtime URL.
 */
const injectEmbeddedScript = (buildId?: string) => {
	const script = document.createElement("script");
	script.src =
		browser.runtime.getURL("src/pages/embedded/index.js") + (buildId ? `?b=${buildId}` : "");
	script.type = "module";
	document.documentElement.appendChild(script);
};
let embeddedScriptAppended = false;
const appendEmbeddedScript = () => {
	if (embeddedScriptAppended) return;
	embeddedScriptAppended = true;
	injectEmbeddedScript();
};
const scheduleEmbeddedScript = () => {
	if (document.readyState === "loading") {
		document.addEventListener("readystatechange", () => {
			if (document.readyState === "interactive") appendEmbeddedScript();
		});
	} else {
		appendEmbeddedScript();
	}
};
const getStoredSettings = async (): Promise<configuration> => {
	const settings = await storage.local.get(defaultConfigKeys);
	const storedSettings = Object.keys(settings)
		.filter((key) => defaultConfigKeys.includes(key))
		.reduce(
			(acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }),
			{}
		) as configuration;
	if (Object.keys(storedSettings).length === 0) return defaultConfiguration;
	return deepMerge(defaultConfiguration, storedSettings) as configuration;
};
let cachedSettings: Nullable<configuration> = null;
const getCachedSettings = async (): Promise<configuration> => {
	if (cachedSettings) return cachedSettings;
	cachedSettings = await getStoredSettings();
	return cachedSettings;
};
const invalidateSettingsCache = (): void => {
	cachedSettings = null;
};
type StoredFeatureState = {
	[K in FeatureKeysWithState]: FeatureState[`state:${K}`];
};
let cachedState: Nullable<StoredFeatureState> = null;
const getStoredState = async (): Promise<StoredFeatureState> => {
	if (cachedState) return cachedState;
	const stateKeys = featureLightStateFeatureIds.map((id) => `state:${id}` as const);
	const result = await storage.local.get(stateKeys);
	const state = stateKeys.reduce(
		(acc, key) => Object.assign(acc, { [key.replace("state:", "")]: result[key] }),
		{}
	) as StoredFeatureState;
	cachedState = state;
	return state;
};
/**
 * Page-facing state is deliberately narrower than stored state. videoHistory keeps its full
 * record in extension storage; only the current video's entry crosses the page bridge, so a
 * page script cannot collect the accumulated watch history from message traffic.
 */
const scopeStateForPage = (state: StoredFeatureState): StoredFeatureState => {
	const { videoHistory: history } = state;
	if (!history) return state;
	const storageEntries = history.storage ?? {};
	const videoId = getCurrentVideoId();
	const scopedStorage = videoId ? { [videoId]: storageEntries[videoId] } : {};
	return { ...state, videoHistory: { ...history, storage: scopedStorage } };
};
/**
 * Page-originated videoHistory updates are merged entry-by-entry instead of replacing the stored
 * map, so a page script cannot wipe or rewrite the history of videos other than its own. The
 * entry count is capped so repeated writes cannot grow storage without bound.
 */
const mergeVideoHistoryUpdate = async (incomingState: unknown): Promise<void> => {
	const incoming = (incomingState as null | { storage?: unknown })?.storage;
	if (typeof incoming !== "object" || incoming === null || Array.isArray(incoming)) return;
	const key = "state:videoHistory";
	const { [key]: stored } = (await storage.local.get(key)) as Record<
		string,
		undefined | { storage?: Record<string, unknown> }
	>;
	/**
	 * Self-healing filter: every entry, incoming or already stored, must satisfy the feature's
	 * schema, so invalid data can neither enter storage nor survive there to fail hydration.
	 */
	const candidates = { ...stored?.storage, ...incoming } as Record<string, unknown>;
	const mergedStorage: Record<string, unknown> = {};
	for (const entryKey of Object.keys(candidates)) {
		const { [entryKey]: entryValue } = candidates;
		if (isValidVideoHistoryEntry(entryValue)) mergedStorage[entryKey] = entryValue;
	}
	const entryKeys = Object.keys(mergedStorage);
	if (entryKeys.length > MAX_HISTORY_ENTRIES) {
		const entryTimestamp = (entryKey: string): number => {
			const entry = mergedStorage[entryKey] as null | { timestamp?: unknown };
			return typeof entry?.timestamp === "number" ? entry.timestamp : 0;
		};
		entryKeys
			.sort((a, b) => entryTimestamp(b) - entryTimestamp(a))
			.slice(MAX_HISTORY_ENTRIES)
			.forEach((entryKey) => delete mergedStorage[entryKey]);
	}
	const merged = { ...stored, storage: mergedStorage } as StoredFeatureState["videoHistory"];
	await storage.local.set({ [key]: merged });
	if (cachedState) {
		cachedState = { ...cachedState, videoHistory: merged };
	}
};
/**
 * State only reaches the page in response to an explicit request; the embedded script asks for
 * what it needs (bootstrap, and videoHistory per navigation) instead of receiving a startup
 * broadcast of the complete persisted state.
 */
const onPageHide = () => {
	storage.onChanged.removeListener(storageListeners);
};
let storageForwardingEnabled = false;
const enableStorageForwarding = (): void => {
	if (storageForwardingEnabled) return;
	storageForwardingEnabled = true;
	storage.onChanged.addListener(storageListeners);
	window.addEventListener("pagehide", onPageHide);
};
/**
 * Storage forwarding waits for the embedded instance to publish readiness
 * (DOM marker from the liveness module). pageLoaded remains a faster path.
 */
void waitForReady(30000).then((ready) => {
	if (ready) enableStorageForwarding();
	return undefined;
});
/**
 * Listens for messages from the embedded script via window.postMessage.
 */
const onWindowMessage = (event: MessageEvent) => {
	if (event.source !== window) return;
	const message = event.data as
		| ContentSendOnlyMessages
		| ContentToBackgroundSendOnlyMessages
		| Messages["request"];
	if (message?.origin !== MESSAGE_ORIGIN) return;
	void (async () => {
		if (!message) return;
		const { requestId } = message as { requestId?: string };
		switch (message.action) {
			case "request_action": {
				/**
				 * Only known background messages are forwarded, with the source field forced to
				 * "content". The background keys privileged work off message fields, so a page
				 * script must not be able to choose them (see the devtools branch in the
				 * background worker).
				 */
				if (message.type !== "pauseBackgroundPlayers") break;
				await browser.runtime.sendMessage({ ...message, source: "content" });
				break;
			}
			case "request_data": {
				switch (message.type) {
					case "extensionURL": {
						void sendExtensionMessage(
							"extensionURL",
							"data_response",
							{
								extensionURL: browser.runtime.getURL("")
							},
							requestId
						);
						break;
					}
					case "options": {
						/**
						 * Retrieves the options from the local storage and sends them back to the youtube page.
						 *
						 * @type {configuration}
						 */
						const options: configuration = await getCachedSettings();
						void sendExtensionMessage("options", "data_response", { options }, requestId);
						break;
					}
					case "state": {
						const state = await getStoredState();
						void sendExtensionMessage(
							"state",
							"data_response",
							scopeStateForPage(state),
							requestId
						);
						break;
					}
				}
				break;
			}
			case "send_data": {
				switch (message.type) {
					case "featureStateUpdate": {
						const {
							data: { id, state }
						} = message;
						// Only registered stateful features may be written; anything else is ignored.
						if (!(featureLightStateFeatureIds as readonly string[]).includes(id)) break;
						const serialized = JSON.stringify(state ?? null);
						if (serialized.length > MAX_STATE_JSON_BYTES) break;
						if (id === "videoHistory") {
							await mergeVideoHistoryUpdate(state);
							break;
						}
						await storage.local.set({
							[`state:${id}`]: state
						});
						if (cachedState) {
							cachedState = { ...cachedState, [id]: state };
						}
						break;
					}
					case "pageLoaded": {
						enableStorageForwarding();
						break;
					}
					case "setVolumeBoostAmount": {
						// Page-originated amounts must be finite, non-negative numbers; the
						// setting otherwise keeps its existing fields.
						const { data: amount } = message;
						if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) break;
						const { volumeBoost: existingVolumeBoost } = (await storage.local.get(
							"volumeBoost"
						)) as configuration;
						void storage.local.set({
							volumeBoost: { ...existingVolumeBoost, amount }
						});
						break;
					}
				}
			}
		}
	})();
};
window.addEventListener("message", onWindowMessage);
const storageListeners = (changes: StorageChanges<configuration>, areaName: string) => {
	if (areaName !== "local") return;
	/**
	 * "Clear Data" deletes the registered state keys. Drop them from the cache and tell the page,
	 * so active holders reset instead of writing cleared history back after the wipe.
	 */
	const removedStateIds = Object.entries(changes)
		.filter(([key, change]) => key.startsWith("state:") && change?.newValue === undefined)
		.map(([key]) => key.replace("state:", ""))
		.filter((id): id is keyof StoredFeatureState =>
			(featureLightStateFeatureIds as readonly string[]).includes(id)
		);
	if (removedStateIds.length) {
		if (cachedState) {
			const remaining: Partial<StoredFeatureState> = { ...cachedState };
			for (const id of removedStateIds) delete remaining[id];
			cachedState = remaining as StoredFeatureState;
		}
		sendExtensionOnlyMessage("stateReset", { ids: removedStateIds });
	}
	const changeKeys = Object.keys(changes).filter(
		(key): key is keyof configuration => key in defaultConfiguration
	);
	if (!changeKeys.length) return;
	void storageChangeHandler(changes, areaName);
};
/**
 * Content scripts are classic scripts (manifest), not ES modules. A dynamic import here
 * made Rolldown emit __vitePreload with `import.meta`, which throws in a classic script.
 * Start development mode with a static import instead; production tree-shakes the call.
 */
if (DEV_MODE) {
	startDevelopmentMode({
		defaultConfiguration,
		injectEmbeddedScript,
		onPageHide,
		onWindowMessage,
		scheduleEmbeddedScript,
		storage,
		storageListeners
	});
} else {
	scheduleEmbeddedScript();
}
const castStorageChanges = (changes: StorageChanges<configuration>) => {
	const result: Partial<{
		[K in keyof configuration]: { newValue?: unknown; oldValue?: unknown };
	}> = {};
	for (const [key, change] of Object.entries(changes)) {
		if (key in defaultConfiguration) {
			const typedKey = key;
			result[typedKey] = change;
		}
	}
	return result;
};

type PathEvent<P extends Path<configuration>, E extends keyof ExtensionSendOnlyMessageMappings> = {
	build: (args: {
		newValue: PathValue<configuration, P>;
		oldValue: PathValue<configuration, P>;
		options: configuration;
		path: P;
	}) => ExtensionSendOnlyMessageMappings[E]["data"];
	event: E;
};
function getProp(obj: unknown, key: string): unknown {
	return isRecord(obj) ? obj[key] : undefined;
}
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
/**
 * onScreenDisplay changes arrive per leaf path, so every field maps to the same broadcast, which carries the full
 * fresh slice.
 */
const buildOnScreenDisplayChange = ({ options }: { options: configuration }) => ({
	onScreenDisplay: options.onScreenDisplay
});
const changeHandlers: {
	[P in Path<Pick<configuration, CoreFeatureKeys | NonFeatureKeys>>]?: PathEvent<
		P,
		keyof ExtensionSendOnlyMessageMappings
	>;
} = {
	"featureMenu.openType": {
		build: ({ newValue }) => ({
			featureMenuOpenType: newValue
		}),
		event: "featureMenuOpenTypeChange"
	},
	language: {
		build: ({ newValue }) => ({
			language: newValue
		}),
		event: "languageChange"
	},
	"onScreenDisplay.color": {
		build: buildOnScreenDisplayChange,
		event: "onScreenDisplayConfigChange"
	},
	"onScreenDisplay.hideTime": {
		build: buildOnScreenDisplayChange,
		event: "onScreenDisplayConfigChange"
	},
	"onScreenDisplay.opacity": {
		build: buildOnScreenDisplayChange,
		event: "onScreenDisplayConfigChange"
	},
	"onScreenDisplay.padding": {
		build: buildOnScreenDisplayChange,
		event: "onScreenDisplayConfigChange"
	},
	"onScreenDisplay.position": {
		build: buildOnScreenDisplayChange,
		event: "onScreenDisplayConfigChange"
	},
	"onScreenDisplay.type": {
		build: buildOnScreenDisplayChange,
		event: "onScreenDisplayConfigChange"
	}
};
function emitPathEvent<P extends keyof typeof changeHandlers>({
	newValue,
	oldValue,
	options,
	path
}: {
	newValue: PathValue<configuration, P>;
	oldValue: PathValue<configuration, P>;
	options: configuration;
	path: P;
}): void {
	const { [path]: def } = changeHandlers;
	if (!def) return;

	sendExtensionOnlyMessage(def.event, def.build({ newValue, oldValue, options, path }));
}
const storageChangeHandler = async (changes: StorageChanges<unknown>, areaName: string) => {
	if (areaName !== "local") return;
	const castedChanges = castStorageChanges(changes);
	invalidateSettingsCache();
	const options = await getCachedSettings();
	const featureUpdates = new Map<FeatureKeys, { configChanged: boolean; stateChanged: boolean }>();
	handleConfigChanges(castedChanges, ({ newValue, oldValue, path }) => {
		const rootKey = getRootKey(path);
		if (isFeatureKey(rootKey)) {
			let entry = featureUpdates.get(rootKey);
			if (!entry) {
				entry = { configChanged: false, stateChanged: false };
				featureUpdates.set(rootKey, entry);
			}
			entry.configChanged = true;
			if (
				(path.endsWith(".enabled") && typeof newValue === "boolean") ||
				path.endsWith(".placement")
			) {
				entry.stateChanged = true;
			}
		}
		emitPathEvent({
			newValue,
			oldValue,
			options,
			path
		});
	});
	for (const [feature, update] of featureUpdates) {
		const { [feature]: config } = options;
		if (update.configChanged || update.stateChanged) {
			sendExtensionOnlyMessage("featureUpdate", {
				config,
				enabled: resolveEnabled(config),
				id: feature
			});
		}
	}
};
type ConfigPathChange<P extends keyof typeof changeHandlers> = {
	newValue: PathValue<configuration, P>;
	oldValue: PathValue<configuration, P>;
	path: P;
};
function getRootKey(path: string): keyof configuration {
	return path.split(".")[0] as keyof configuration;
}
function handleConfigChanges(
	changes: Partial<Record<keyof configuration, chrome.storage.StorageChange>>,
	handler: <P extends keyof typeof changeHandlers>(change: ConfigPathChange<P>) => void
): void {
	for (const rootKey of Object.keys(changes)) {
		const { [rootKey]: change } = changes;
		if (!change) continue;

		const walk = (oldObj: unknown, newObj: unknown, path: string): void => {
			if (deepEqual(oldObj, newObj)) return;

			const isObject = typeof newObj === "object" && newObj !== null;
			const isOldObject = typeof oldObj === "object" && oldObj !== null;

			// leaf-only: call handler only if at least one side is non-object
			if (!isObject || !isOldObject) {
				handler({
					newValue: newObj as PathValue<configuration, keyof typeof changeHandlers>,
					oldValue: oldObj as PathValue<configuration, keyof typeof changeHandlers>,
					path: path as keyof typeof changeHandlers
				});
				return;
			}

			// combine keys to handle added/removed properties
			const keys = new Set([
				...Object.keys(newObj as Record<string, unknown>),
				...Object.keys(oldObj as Record<string, unknown>)
			]);

			for (const key of keys) {
				walk(getProp(oldObj, key), getProp(newObj, key), `${path}.${key}`);
			}
		};

		walk(change.oldValue, change.newValue, rootKey);
	}
}
