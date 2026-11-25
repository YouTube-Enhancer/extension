/**
 * window.postMessage dispatcher for the embedded script.
 *
 * Extracted from index.ts: the guards and every switch body are byte-for-byte
 * the code that used to live there — relocation, not a rewrite. The content script's storage
 * plumbing the handler needs (settings cache, state cache, storage handle) moved here with it so
 * this module does not import index.ts.
 */

import browser from "webextension-polyfill";

import type EnUS from "@/public/locales/en-US.json.d";
import type { FeatureKeysWithState, FeatureState } from "@/src/features/_registry/types";
import type {
	configuration,
	ContentSendOnlyMessages,
	ContentToBackgroundSendOnlyMessages,
	Messages,
	Nullable
} from "@/src/types";

import { featureLightStateFeatureIds } from "@/src/features/_registry/generatedFeatureLightManifest";
import { videoHistoryEntrySchema } from "@/src/features/videoHistory/index.metadata";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { DEV_MODE } from "@/src/utils/config/env";
import { deepMerge, parseStoredValue } from "@/src/utils/config/utils";
import { READY_ATTR, waitForReady } from "@/src/utils/embedded/instanceLiveness";
import { MESSAGE_ORIGIN, sendExtensionMessage } from "@/src/utils/messaging";
import { getCurrentVideoId } from "@/src/utils/url";

// Polyfill may return Chrome's native (partial) browser API which can lack storage.
export const storage = browser.storage ?? chrome.storage;
export const defaultConfiguration = getDefaultConfiguration();
const defaultConfigKeys = Object.keys(defaultConfiguration);
/** Upper bound on a single page-originated feature-state write (roughly a quarter of the storage quota). */
const MAX_STATE_JSON_BYTES = 100_000;
/** videoHistory entries kept in storage; the oldest beyond this are pruned on write. */
const MAX_HISTORY_ENTRIES = 1000;
/**
 * videoHistory map keys are video ids (11 chars); 64 is the write-boundary ceiling. The entry id
 * is bounded by the shared schema, but map keys are arbitrary strings a page chooses, so without
 * this a page could fatten keys entry-by-entry until the merged map exhausts the storage quota.
 */
const MAX_HISTORY_KEY_LENGTH = 64;
/**
 * Serialized ceiling for the merged videoHistory map — ~10x a legitimate 1000-entry history
 * (entry = 11-char id + enum status + number, so the whole map is tens of KB).
 */
const MAX_HISTORY_BYTES = 1_000_000;
/**
 * The content script applies the feature's own stateSchema (exported by its
 * index.metadata.ts) at the page-facing write boundary, and hydration applies the same schema
 * again inside the page-world registry. Without the write-boundary check a page-planted invalid
 * entry would fail every hydration while the merge path kept re-storing it forever.
 */
const isValidVideoHistoryEntry = (value: unknown): boolean =>
	videoHistoryEntrySchema.safeParse(value).success;

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
export const getCachedSettings = async (): Promise<configuration> => {
	if (cachedSettings) return cachedSettings;
	cachedSettings = await getStoredSettings();
	return cachedSettings;
};
export const invalidateSettingsCache = (): void => {
	cachedSettings = null;
};
export type StoredFeatureState = {
	[K in FeatureKeysWithState]: FeatureState[`state:${K}`];
};
export let cachedState: Nullable<StoredFeatureState> = null;
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
	/**
	 * A video with no stored entry must scope to an empty record. Building
	 * `{ [videoId]: storageEntries[videoId] }` anyway yields `{ [videoId]: undefined }`, and that
	 * key survives the structured clone across the bridge, so the record schema rejects it with
	 * invalid_type at that key - failing hydration for every watch page whose video is not yet in
	 * the history. The entry is validated here for the same reason the write boundary is: an
	 * invalid stored entry would otherwise reach the page and fail the same parse.
	 */
	const entry = videoId ? storageEntries[videoId] : undefined;
	const scopedStorage =
		videoId && entry && isValidVideoHistoryEntry(entry) ? { [videoId]: entry } : {};
	return { ...state, videoHistory: { ...history, storage: scopedStorage } };
};
/** Set once a refused over-budget write has been reported, so a flooding page can't spam the log. */
let historyBudgetWarned = false;
/**
 * Page-originated videoHistory updates are merged entry-by-entry instead of replacing the stored
 * map, and only the entry for the video the page currently owns may be applied: incoming keys
 * other than `getCurrentVideoId()` are ignored entirely, so a page script can neither wipe the
 * stored map nor add or rewrite entries for videos other than its own. The entry count and the
 * serialized size are capped so repeated writes cannot grow storage without bound.
 *
 * Cost of the ownership rule: a legitimate push batches the whole page-side state map, so an
 * entry for an earlier video of this session that is not yet in storage (its write failed, or it
 * comes from a legacy `localStorage` migration) is dropped here instead of being re-added.
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
	 * Ownership gate: only the current video's incoming key may add to or overwrite storage;
	 * every other candidate key comes from `stored` alone, so unowned incoming keys can neither
	 * replace an existing entry nor inject a new one.
	 */
	const incomingStorage = incoming as Record<string, unknown>;
	const ownedVideoId = getCurrentVideoId();
	const candidates = { ...stored?.storage } as Record<string, unknown>;
	if (ownedVideoId && Object.hasOwn(incomingStorage, ownedVideoId)) {
		const { [ownedVideoId]: ownedEntry } = incomingStorage;
		candidates[ownedVideoId] = ownedEntry;
	}
	/**
	 * Self-healing filter: every entry, incoming or already stored, must satisfy the feature's
	 * schema, so invalid data can neither enter storage nor survive there to fail hydration.
	 * Keys over the video-id ceiling are skipped for the same reason — the schema bounds the
	 * entry id but not the page-chosen map key, and a stored key that oversized is already part
	 * of the quota problem (real history keys are video ids, so none of them are dropped).
	 */
	const mergedStorage: Record<string, unknown> = {};
	for (const entryKey of Object.keys(candidates)) {
		if (entryKey.length > MAX_HISTORY_KEY_LENGTH) continue;
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
	/**
	 * Byte budget: refuse the write rather than truncate stored entries. Dropping the incoming
	 * additions keeps storage as it is, so a flooding page can never shrink real history to fit
	 * its own payload; the stored map alone is never cut down to fit under the ceiling.
	 */
	if (JSON.stringify(mergedStorage).length > MAX_HISTORY_BYTES) {
		if (!historyBudgetWarned) {
			historyBudgetWarned = true;
			console.warn(
				`[yte] videoHistory write refused: merged map exceeds ${MAX_HISTORY_BYTES} bytes; keeping stored entries`
			);
		}
		return;
	}
	await storage.local.set({ [key]: merged });
	if (cachedState) {
		cachedState = { ...cachedState, videoHistory: merged };
	}
};

/** Feature updates dispatched to the embedded script; lets the test config-write handler detect writes that produced nothing to reconcile. */
let dispatchedFeatureUpdates = 0;
/** The in-flight test write's acknowledgement nonce; rides the featureUpdate so the embedded script answers for that write. */
export let pendingTestWriteNonce: null | string = null;
/** Resolves the in-flight test_setConfigValue write once storage has settled. */
export let testConfigWriteSettled: (() => void) | null = null;

/**
 * Cross-module writes: ESM forbids assigning to an imported binding, so the content script's
 * storage-change path (index.ts, later storageForwarding.ts) goes through these instead.
 */
export const setCachedState = (next: Nullable<StoredFeatureState>): void => {
	cachedState = next;
};
export const bumpDispatchedFeatureUpdates = (): void => {
	dispatchedFeatureUpdates += 1;
};
export const clearTestConfigWriteSettled = (): void => {
	testConfigWriteSettled = null;
};

/**
 * The dispatcher's `pageLoaded` and test-write cases enable storage forwarding, but the
 * forwarding block (listener registration + lifecycle) lives with the content script's startup
 * code; importing it back would make this module and index.ts import each other. index.ts
 * registers the pair here before it attaches the window message listener, so both hooks are set
 * before any message can arrive.
 */
let enableStorageForwardingHook: () => void = () => {};
let isStorageForwardingEnabledHook: () => boolean = () => false;
export const registerStorageForwardingHooks = (hooks: {
	enable: () => void;
	isEnabled: () => boolean;
}): void => {
	enableStorageForwardingHook = hooks.enable;
	isStorageForwardingEnabledHook = hooks.isEnabled;
};
/**
 * Listens for messages from the embedded script via window.postMessage.
 */
export const onWindowMessage = (event: MessageEvent) => {
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
					case "translations": {
						/**
						 * The embedded script runs in youtube.com's page world, where Chrome ≥157
						 * refuses the frame's cross-origin `chrome-extension://` load — and the
						 * same refusal covers this isolated world, so the file cannot be read here
						 * either. The background worker (extension origin, no frame) fetches it
						 * instead; this case is a pure relay: the parsed messages — not a URL the
						 * page would be refused for fetching — cross the bridge.
						 */
						const {
							data: { locale }
						} = message;
						let translations: EnUS | null = null;
						try {
							const response = (await browser.runtime.sendMessage({
								action: "request_action",
								data: { locale },
								source: "content",
								type: "getTranslations"
							} satisfies ContentToBackgroundSendOnlyMessages)) as
								| undefined
								| { translations: EnUS | null };
							translations = response?.translations ?? null;
						} catch {
							// Worker unreachable: answer `null` so the page throws instead of waiting out the bridge timeout.
							translations = null;
						}
						void sendExtensionMessage(
							"translations",
							"data_response",
							{ locale, translations },
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
						enableStorageForwardingHook();
						document.documentElement.setAttribute("yte-ready", "");
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
					/**
					 * ⚠ Test-only entrypoint.
					 * Directly writes to browser.storage.local via content script pipeline.
					 * Exists solely to support E2E tests (Playwright). Not a runtime feature.
					 */
					case "test_setConfigValue": {
						// Test-only entrypoint: compiled out of release builds, where DEV_MODE is
						// statically false, so pages cannot trigger storage rewrites.
						if (!DEV_MODE) break;
						/**
						 * The write only reaches the embedded script through the storage listener
						 * that forwards it. On a freshly (re)loaded document (YouTube's error
						 * watcher, reload storms) that listener may not be attached yet: the
						 * write would fire no change event and dispatch no featureUpdate, so the
						 * wait for this write's acknowledgement would never resolve. Wait for
						 * the embedded instance and attach forwarding first; when it never comes,
						 * answer with a failed acknowledgement so the waiting write fails fast by
						 * name instead of timing out.
						 */
						const {
							data: { key, nonce, value }
						} = message;
						const acknowledge = (state: "failed" | "ok") => {
							document.documentElement.setAttribute(
								"yte-config-processing",
								state === "ok" ? nonce : `failed:${nonce}`
							);
						};
						if (!isStorageForwardingEnabledHook()) {
							const ready = await waitForReady(30_000);
							if (!ready) {
								/**
								 * Loud on purpose: this is the second gate on the same readiness
								 * signal, and a silent timeout here hides a dead page-world script
								 * behind a generic failed acknowledgement.
								 */
								console.warn(
									`[yte] waitForReady timed out after 30000 ms for the test config ` +
										`write of "${key}" (nonce ${nonce}): document.documentElement never ` +
										`published the ${READY_ATTR} attribute, so the page-world embedded ` +
										`script is not running. Acknowledging the write as failed.`
								);
								acknowledge("failed");
								break;
							}
							enableStorageForwardingHook();
						}
						const config = await storage.local.get();
						const keys = key.split(".");
						let current = config;
						for (const segment of keys.slice(0, -1)) {
							current = current[segment] as Record<string, unknown>;
						}
						const leafKey = keys.at(-1)!;
						const { [leafKey]: previous } = current;
						current[leafKey] = value;
						// An identical value fires no storage event and needs no reconcile, so it is
						// acknowledged explicitly instead of waiting out a grace timer.
						if (JSON.stringify(previous) === JSON.stringify(value)) {
							acknowledge("ok");
							break;
						}
						pendingTestWriteNonce = nonce;
						const dispatchedBefore = dispatchedFeatureUpdates;
						const settled = new Promise<void>((resolve) => {
							testConfigWriteSettled = resolve;
						});
						await storage.local.set(config);
						await settled;
						// featureUpdates are reconciled by the embedded script, which acknowledges with
						// this write's nonce itself. When the write dispatched none there is nothing to
						// reconcile, so the acknowledgement is set here.
						if (dispatchedFeatureUpdates === dispatchedBefore) {
							acknowledge("ok");
						}
						pendingTestWriteNonce = null;
						break;
					}
				}
			}
		}
	})();
};
