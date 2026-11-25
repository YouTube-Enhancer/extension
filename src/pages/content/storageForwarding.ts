/**
 * Storage-change forwarding for the content script.
 *
 * Extracted from index.ts: the storage listener, the config-change routing
 * table and the featureUpdate broadcast are byte-for-byte the code that used to live there. The
 * forwarding lifecycle (enable / pagehide / pageshow) stays in index.ts next to the startup side
 * effects that wire it; index.ts registers those into the dispatcher's hooks.
 */

import type { CoreFeatureKeys, FeatureKeys, NonFeatureKeys } from "@/src/features/_registry/types";
import type { StoredFeatureState } from "@/src/pages/content/windowMessageDispatcher";
import type {
	configuration,
	ExtensionSendOnlyMessageMappings,
	Path,
	PathValue,
	StorageChanges
} from "@/src/types";

import { isFeatureKey, resolveEnabled } from "@/src/features/_registry/featureRegistryCore";
import { featureLightStateFeatureIds } from "@/src/features/_registry/generatedFeatureLightManifest";
import {
	bumpDispatchedFeatureUpdates,
	cachedState,
	clearTestConfigWriteSettled,
	defaultConfiguration,
	getCachedSettings,
	invalidateSettingsCache,
	pendingTestWriteNonce,
	setCachedState,
	testConfigWriteSettled
} from "@/src/pages/content/windowMessageDispatcher";
import { DEV_MODE } from "@/src/utils/config/env";
import { deepEqual } from "@/src/utils/deepEqual";
import { sendExtensionOnlyMessage } from "@/src/utils/messaging";

export const storageListeners = (changes: StorageChanges<configuration>, areaName: string) => {
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
			setCachedState(remaining as StoredFeatureState);
		}
		sendExtensionOnlyMessage("stateReset", { ids: removedStateIds });
	}
	const changeKeys = Object.keys(changes).filter(
		(key): key is keyof configuration => key in defaultConfiguration
	);
	if (!changeKeys.length) return;
	void storageChangeHandler(changes, areaName);
};

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
				id: feature,
				...(pendingTestWriteNonce ? { nonce: pendingTestWriteNonce } : {})
			});
			if (DEV_MODE) bumpDispatchedFeatureUpdates();
		}
	}
	if (DEV_MODE) {
		testConfigWriteSettled?.();
		clearTestConfigWriteSettled();
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
