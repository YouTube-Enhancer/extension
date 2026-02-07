import type { configuration } from "@/src/types";

import { deepMerge } from "@/src/utils/utilities";

import { defaultConfiguration } from "./utils/constants";

const HAS_LOCAL_STORAGE = (() => {
	try {
		return typeof localStorage !== "undefined";
	} catch {
		return false;
	}
})();

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
	const chromeStored = await chrome.storage.local.get();
	const finalSettings = {} as configuration;
	const chromeUpdates: Partial<configuration> = {};
	const localUpdates: Record<string, string> = {};
	for (const option of Object.keys(defaultConfiguration) as (keyof configuration)[]) {
		const { [option]: defaultValue } = defaultConfiguration;
		const localValueString = HAS_LOCAL_STORAGE ? localStorage.getItem(option as string) : null;
		const chromeValue = chromeStored?.[option as string];
		let storedValue: unknown = null;
		// Get existing value
		if (localValueString !== null) {
			try {
				storedValue =
					typeof defaultValue === "object" || typeof defaultValue === "boolean" || typeof defaultValue === "number" ?
						JSON.parse(localValueString)
					:	localValueString;
			} catch (error) {
				console.error(`Error parsing localStorage value for ${String(option)}:`, error);
			}
		} else if (chromeValue !== undefined) {
			storedValue = chromeValue;
			if (HAS_LOCAL_STORAGE) {
				localUpdates[option as string] = typeof chromeValue === "string" ? chromeValue : JSON.stringify(chromeValue);
			}
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
		if (HAS_LOCAL_STORAGE) {
			localUpdates[option as string] = typeof storedValue === "string" ? storedValue : JSON.stringify(storedValue);
		}
		setSetting(finalSettings, option, storedValue as configuration[typeof option]);
	}
	// Single storage writes instead of N writes
	if (Object.keys(chromeUpdates).length) {
		await chrome.storage.local.set(chromeUpdates);
	}
	if (HAS_LOCAL_STORAGE) {
		for (const [key, value] of Object.entries(localUpdates) as [string, string][]) {
			localStorage.setItem(key, value);
		}
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
})().catch(console.error);
