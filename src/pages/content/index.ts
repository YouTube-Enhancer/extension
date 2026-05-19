import browser from "webextension-polyfill";

import type { CoreFeatureKeys, FeatureKeys, FeatureKeysWithState, FeatureState, NonFeatureKeys } from "@/src/features/_registry/types";

import { invalidateDevToolsCache } from "@/src/components/devtools/hooks/useDevToolsQuery";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { isFeatureKey, resolveEnabled } from "@/src/features/_registry/featureRegistry";
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
import { sendExtensionMessage, sendExtensionOnlyMessage } from "@/src/utils/messaging";
import { setupContentScriptBridge } from "@/src/utils/messaging/devtools";
const defaultConfiguration = getDefaultConfiguration();
/**
 * Adds a script element to the document's root element, which loads a JavaScript file from the extension's runtime URL.
 * Also creates a hidden div element with a specific ID to receive messages from the extension.
 */
const script = document.createElement("script");
script.src = chrome.runtime.getURL("src/pages/embedded/index.js");
script.type = "text/javascript";
function initializeCommunicationElement() {
	const element = document.createElement("div");
	element.style.display = "none";
	element.id = "yte-message-from-extension";
	document.documentElement.appendChild(element);
}
initializeCommunicationElement();
document.documentElement.appendChild(script);
if (DEV_MODE) {
	setupContentScriptBridge();
	const seenKeys = new Set<string>();
	browser.storage.onChanged.addListener((changes, areaName) => {
		if (areaName !== "local") return;
		const keys = Object.keys(changes).filter((key) => key in defaultConfiguration);
		if (!keys.length) return;
		for (const key of keys) {
			if (seenKeys.has(key)) continue;
			seenKeys.add(key);
			setTimeout(() => seenKeys.delete(key), 2000);
		}
		void invalidateDevToolsCache(keys);
	});
}
const getStoredSettings = async (): Promise<configuration> => {
	const options: configuration = await new Promise((resolve) => {
		void browser.storage.local.get(null).then((settings) => {
			const storedSettings = Object.keys(settings)
				.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string))
				.reduce((acc, key) => Object.assign(acc, { [key]: settings[key] }), {}) as configuration;
			return resolve(storedSettings);
		});
	});
	return options;
};
const getStoredState = async (): Promise<{
	[K in FeatureKeysWithState]: FeatureState[`state:${K}`];
}> => {
	const stateKeys = metadataRegistry
		.getAll()
		.filter((feature) => feature.stateSchemaInput !== undefined)
		.map((feature) => `state:${feature.id}` as const);
	const result = await browser.storage.local.get(stateKeys);
	const state = stateKeys.reduce((acc, key) => Object.assign(acc, { [key.replace("state:", "")]: result[key] }), {}) as {
		[K in FeatureKeysWithState]: FeatureState[`state:${K}`];
	};
	return state;
};
void (async () => {
	const [options, state] = await Promise.all([getStoredSettings(), getStoredState()]);
	await Promise.all([sendExtensionMessage("options", "data_response", { options }), sendExtensionMessage("state", "data_response", { state })]);
})();
/**
 * Listens for the "yte-message-from-youtube" event and handles incoming messages from the YouTube page.
 *
 * @returns {void}
 */
document.addEventListener("yte-message-from-youtube", () => {
	void (async () => {
		const provider = document.querySelector("#yte-message-from-youtube");
		if (!provider) return;
		const { textContent: stringifiedMessage } = provider;
		if (!stringifiedMessage) return;
		let message;
		try {
			message = JSON.parse(stringifiedMessage) as ContentSendOnlyMessages | ContentToBackgroundSendOnlyMessages | Messages["request"];
		} catch (error) {
			console.error("[ContentScript] Failed to parse incoming message:", error);
			return;
		}
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
						const options: configuration = await getStoredSettings();
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
						await browser.storage.local.set({
							[`state:${id}`]: state
						});
						break;
					}
					case "pageLoaded": {
						browser.storage.onChanged.addListener(storageListeners);
						window.addEventListener("pagehide", () => {
							browser.storage.onChanged.removeListener(storageListeners);
						});
						break;
					}
					case "setVolumeBoostAmount": {
						const { volumeBoost: existingVolumeBoost } = (await browser.storage.local.get("volumeBoost")) as configuration;
						void browser.storage.local.set({ volumeBoost: { ...existingVolumeBoost, amount: message.data } });
						break;
					}
					/**
					 * ⚠ Test-only entrypoint.
					 * Directly writes to browser.storage.local via content script pipeline.
					 * Exists solely to support E2E tests (Playwright). Not a runtime feature.
					 */
					case "test_setConfigValue": {
						const {
							data: { key, value }
						} = message;
						const config = await browser.storage.local.get();
						const keys = key.split(".");
						let current = config;
						for (const segment of keys.slice(0, -1)) {
							current = current[segment] as Record<string, unknown>;
						}
						current[keys.at(-1)!] = value;
						await browser.storage.local.set(config);
						break;
					}
				}
			}
		}
	})();
});
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
			const typedKey = key as keyof configuration;
			result[typedKey] = change as { newValue?: unknown; oldValue?: unknown };
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
	const options = await getStoredSettings();
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
