import browser from "webextension-polyfill";

import type { CoreFeatureKeys, FeatureKeys, FeatureKeysWithState, FeatureState, NonFeatureKeys } from "@/src/features/_registry/types";

import { invalidateDevToolsCache } from "@/src/components/devtools/hooks/useDevToolsQuery";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { isFeatureKey, resolveEnabled } from "@/src/features/_registry/featureRegistryCore";
import {
	type configuration,
	type ContentSendOnlyMessages,
	type ContentToBackgroundSendOnlyMessages,
	type ExtensionSendOnlyMessageMappings,
	type Messages,
	type Path,
	type PathValue,
	type StorageChanges
} from "@/src/types";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { DEV_MODE } from "@/src/utils/config/env";
import { deepMerge, parseStoredValue } from "@/src/utils/config/utils";
import { DEV_RELOAD_SOURCE, type DevWindowMessage, isDevRuntimeMessage, isDevWindowMessage } from "@/src/utils/dev/hotReload";
import { MESSAGE_ORIGIN, sendExtensionMessage, sendExtensionOnlyMessage } from "@/src/utils/messaging";
import { setupContentScriptBridge, teardownContentScriptBridge } from "@/src/utils/messaging/devtools";

// Polyfill may return Chrome's native (partial) browser API which can lack storage.
const storage = browser.storage ?? chrome.storage;
const defaultConfiguration = getDefaultConfiguration();
/**
 * Adds a script element to the document's root element, which loads a JavaScript file from the extension's runtime URL.
 */
const injectEmbeddedScript = (buildId?: string) => {
	const script = document.createElement("script");
	script.src = browser.runtime.getURL("src/pages/embedded/index.js") + (buildId ? `?b=${buildId}` : "");
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
if (DEV_MODE) {
	startDevelopmentMode();
} else {
	scheduleEmbeddedScript();
}
const getStoredSettings = async (): Promise<configuration> => {
	const options: configuration = await new Promise((resolve) => {
		void storage.local.get(null).then((settings) => {
			const storedSettings = Object.keys(settings)
				.filter((key) => Object.keys(defaultConfiguration).includes(key))
				.reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {}) as configuration;
			return resolve(deepMerge(defaultConfiguration, storedSettings) as configuration);
		});
	});
	return options;
};
let cachedSettings: configuration | null = null;
const getCachedSettings = async (): Promise<configuration> => {
	if (cachedSettings) return cachedSettings;
	cachedSettings = await getStoredSettings();
	return cachedSettings;
};
const invalidateSettingsCache = (): void => {
	cachedSettings = null;
};
const getStoredState = async (): Promise<{
	[K in FeatureKeysWithState]: FeatureState[`state:${K}`];
}> => {
	const stateKeys = metadataRegistry
		.getAll()
		.filter((feature) => "stateSchemaInput" in feature)
		.map((feature) => `state:${feature.id}` as const);
	const result = await storage.local.get(stateKeys);
	const state = stateKeys.reduce((acc, key) => Object.assign(acc, { [key.replace("state:", "")]: result[key] }), {}) as {
		[K in FeatureKeysWithState]: FeatureState[`state:${K}`];
	};
	return state;
};
void (async () => {
	const [options, state] = await Promise.all([getStoredSettings(), getStoredState()]);
	await Promise.all([sendExtensionMessage("options", "data_response", { options }), sendExtensionMessage("state", "data_response", { state })]);
})();
const onPageHide = () => {
	storage.onChanged.removeListener(storageListeners);
};
/**
 * Listens for messages from the embedded script via window.postMessage.
 */
const onWindowMessage = (event: MessageEvent) => {
	if (event.source !== window) return;
	const message = event.data as ContentSendOnlyMessages | ContentToBackgroundSendOnlyMessages | Messages["request"];
	if (message?.origin !== MESSAGE_ORIGIN) return;
	void (async () => {
		if (!message) return;
		switch (message.action) {
			case "request_action": {
				await browser.runtime.sendMessage(message);
				break;
			}
			case "request_data": {
				switch (message.type) {
					case "extensionURL": {
						void sendExtensionMessage("extensionURL", "data_response", {
							extensionURL: browser.runtime.getURL("")
						});
						break;
					}
					case "options": {
						/**
						 * Retrieves the options from the local storage and sends them back to the youtube page.
						 *
						 * @type {configuration}
						 */
						const options: configuration = await getCachedSettings();
						void sendExtensionMessage("options", "data_response", { options });
						break;
					}
					case "state": {
						const state = await getStoredState();
						void sendExtensionMessage("state", "data_response", state);
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
						await storage.local.set({
							[`state:${id}`]: state
						});
						break;
					}
					case "pageLoaded": {
						storage.onChanged.addListener(storageListeners);
						window.addEventListener("pagehide", onPageHide);
						break;
					}
					case "setVolumeBoostAmount": {
						const { volumeBoost: existingVolumeBoost } = (await storage.local.get("volumeBoost")) as configuration;
						void storage.local.set({ volumeBoost: { ...existingVolumeBoost, amount: message.data } });
						break;
					}
				}
			}
		}
	})();
};
window.addEventListener("message", onWindowMessage);
/**
 * Development only. Everything hot reload needs lives in this one function so that a production build, where the
 * call above is dead, drops it and its imports entirely. It wires the devtools bridge, then the takeover protocol:
 * when the background worker re-injects this script it first sets `__yteDevReinject`, so the new instance retires
 * the older instances on the page (they hear the takeover on `window`, which works even after an extension reload
 * has invalidated their `chrome.*` handles), asks the running embedded script to disable everything, and injects the
 * rebuilt one under a fresh URL. A rebuilt embedded script alone arrives as a runtime message and is swapped the same
 * way. The video keeps playing throughout.
 */
function startDevelopmentMode(): void {
	const isReinjection = (globalThis as { __yteDevReinject?: boolean }).__yteDevReinject === true;
	delete (globalThis as { __yteDevReinject?: boolean }).__yteDevReinject;
	const instanceId = crypto.randomUUID();

	const requestEmbeddedDispose = () =>
		new Promise<void>((resolve) => {
			const finish = () => {
				clearTimeout(timeout);
				window.removeEventListener("message", onDisposed);
				resolve();
			};
			const onDisposed = (event: MessageEvent) => {
				if (event.source === window && isDevWindowMessage(event.data) && event.data.type === "disposed") finish();
			};
			const timeout = setTimeout(finish, 2000);
			window.addEventListener("message", onDisposed);
			window.postMessage({ source: DEV_RELOAD_SOURCE, type: "dispose" } satisfies DevWindowMessage, "*");
		});
	const swapEmbeddedScript = async (buildId: string) => {
		await requestEmbeddedDispose();
		for (const oldScript of document.querySelectorAll('script[src*="src/pages/embedded/index.js"]')) oldScript.remove();
		injectEmbeddedScript(buildId);
	};
	const devInvalidateListener = (changes: Record<string, unknown>, areaName: string) => {
		if (areaName !== "local") return;
		const keys = Object.keys(changes).filter((key) => key in defaultConfiguration);
		if (!keys.length) return;
		void invalidateDevToolsCache(keys);
	};
	const onDevRuntimeMessage = (message: unknown) => {
		if (!isDevRuntimeMessage(message)) return false;
		void swapEmbeddedScript(message.buildId);
		return false;
	};
	const dispose = () => {
		window.removeEventListener("message", onWindowMessage);
		window.removeEventListener("message", onTakeoverMessage);
		window.removeEventListener("pagehide", onPageHide);
		try {
			storage.onChanged.removeListener(storageListeners);
			storage.onChanged.removeListener(devInvalidateListener);
			chrome.runtime.onMessage.removeListener(onDevRuntimeMessage);
			teardownContentScriptBridge();
		} catch {
			// Extension context invalidated: the listeners died with it.
		}
	};
	const onTakeoverMessage = (event: MessageEvent) => {
		if (event.source !== window || !isDevWindowMessage(event.data) || event.data.type !== "takeover") return;
		if (event.data.instanceId === instanceId) return;
		dispose();
	};

	setupContentScriptBridge();
	storage.onChanged.addListener(devInvalidateListener);
	window.addEventListener("message", onTakeoverMessage);
	chrome.runtime.onMessage.addListener(onDevRuntimeMessage);

	if (isReinjection) {
		embeddedScriptAppended = true;
		window.postMessage({ instanceId, source: DEV_RELOAD_SOURCE, type: "takeover" } satisfies DevWindowMessage, "*");
		void swapEmbeddedScript(Date.now().toString(36));
	} else {
		scheduleEmbeddedScript();
	}
}
const storageListeners = (changes: StorageChanges<configuration>, areaName: string) => {
	if (areaName !== "local") return;
	const changeKeys = Object.keys(changes).filter((key): key is keyof configuration => key in defaultConfiguration);
	if (!changeKeys.length) return;
	void storageChangeHandler(changes, areaName);
};
const deepEqual = (a: unknown, b: unknown): boolean => {
	if (a === b) return true;
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
		return false;
	}
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	for (const key of keysA) {
		if (!keysB.includes(key)) return false;
		if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
	}
	return true;
};
const isValidChange = (change?: { newValue?: unknown; oldValue?: unknown }) => {
	if (change?.newValue === undefined || change?.oldValue === undefined) return false;
	return !deepEqual(change.oldValue, change.newValue);
};
const castStorageChanges = (changes: StorageChanges<configuration>) => {
	const result: Partial<{ [K in keyof configuration]: { newValue?: unknown; oldValue?: unknown } }> = {};
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
const buildOnScreenDisplayChange = ({ options }: { options: configuration }) => ({ onScreenDisplay: options.onScreenDisplay });
const changeHandlers: {
	[P in Path<Pick<configuration, CoreFeatureKeys | NonFeatureKeys>>]?: PathEvent<P, keyof ExtensionSendOnlyMessageMappings>;
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
	"onScreenDisplay.color": { build: buildOnScreenDisplayChange, event: "onScreenDisplayConfigChange" },
	"onScreenDisplay.hideTime": { build: buildOnScreenDisplayChange, event: "onScreenDisplayConfigChange" },
	"onScreenDisplay.opacity": { build: buildOnScreenDisplayChange, event: "onScreenDisplayConfigChange" },
	"onScreenDisplay.padding": { build: buildOnScreenDisplayChange, event: "onScreenDisplayConfigChange" },
	"onScreenDisplay.position": { build: buildOnScreenDisplayChange, event: "onScreenDisplayConfigChange" },
	"onScreenDisplay.type": { build: buildOnScreenDisplayChange, event: "onScreenDisplayConfigChange" }
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
			if ((path.endsWith(".enabled") && typeof newValue === "boolean") || path.endsWith(".placement")) {
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
		if (update.configChanged) {
			sendExtensionOnlyMessage("featureConfigChange", {
				config,
				id: feature
			});
		}
		if (update.stateChanged) {
			sendExtensionOnlyMessage("featureEnabledStateChange", {
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

		// skip changes that are structurally equal
		if (!isValidChange({ newValue: change.newValue, oldValue: change.oldValue })) continue;

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
			const keys = new Set([...Object.keys(newObj as Record<string, unknown>), ...Object.keys(oldObj as Record<string, unknown>)]);

			for (const key of keys) {
				walk(getProp(oldObj, key), getProp(newObj, key), `${path}.${key}`);
			}
		};

		walk(change.oldValue, change.newValue, rootKey);
	}
}
