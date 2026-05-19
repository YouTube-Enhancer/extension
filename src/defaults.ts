import { storage } from "webextension-polyfill";

import type { configuration } from "@/src/types";

import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { deepMerge } from "@/src/utils/config/utils";

const defaultConfiguration = getDefaultConfiguration();
/**
 * Sets default values for all settings in chrome storage and local storage.
 * If a setting doesn't exist in either chrome storage or local storage, it will be set to its default value.
 * If a setting exists in both chrome storage and local storage, its value in chrome storage will be used.
 * If a setting exists only in local storage, its value will be used.
 * If a setting exists only in chrome storage, its value will be used and also written to local storage.
 * After setting all default values, a single write to chrome storage and local storage will be performed.
 * @returns A Promise that resolves with an object containing all the settings with their default values set.
 */
export async function setDefaultValues(): Promise<configuration> {
	const chromeStored = await storage.local.get();
	const finalSettings = {} as configuration;
	const chromeUpdates: Partial<configuration> = {};
	for (const option of Object.keys(defaultConfiguration)) {
		const { [option]: defaultValue } = defaultConfiguration;
		const chromeValue = chromeStored?.[option as string];
		let storedValue: unknown = null;
		// Get existing value
		if (chromeValue !== undefined) {
			storedValue = chromeValue;
		}
		// Missing everywhere → use defaults
		if (storedValue === null || storedValue === undefined) {
			storedValue = defaultValue;
		}
		// Deep merge objects
		if (typeof storedValue === "object" && storedValue !== null && typeof defaultValue === "object" && defaultValue !== null) {
			storedValue = deepMerge(defaultValue as Record<string, unknown>, storedValue as Record<string, unknown>);
		}
		// Queue instead of writing immediately
		setPartialSetting(chromeUpdates, option, storedValue as configuration[typeof option]);
		setSetting(finalSettings, option, storedValue as configuration[typeof option]);
	}
	// Single storage writes instead of N writes
	if (Object.keys(chromeUpdates).length) {
		await storage.local.set(chromeUpdates);
	}
	return finalSettings;
}

function setPartialSetting<K extends keyof configuration>(obj: Partial<configuration>, key: K, value: configuration[K]) {
	obj[key] = value;
}
function setSetting<K extends keyof configuration>(obj: configuration, key: K, value: configuration[K]) {
	obj[key] = value;
}

(async () => {
	await setDefaultValues();
})().catch((err) => console.error("[defaults] Failed to set default values:", err));
