import type { configuration } from "@/src/types";

import { defaultConfiguration } from "@/src/utils/constants";
import { isLegacyConfiguration, migrateConfiguration, parseStoredValue } from "@/src/utils/utilities";

export async function updateStoredSettings() {
	try {
		const rawStorage = await chrome.storage.local.get(null);
		const rawKeys = Object.keys(rawStorage) as string[];
		let settings = await getStoredSettings();
		// Migrate legacy configuration
		if (isLegacyConfiguration(settings)) {
			settings = migrateConfiguration(settings, defaultConfiguration);
		}
		// Remove keys that are not in the default configuration
		const validKeys = new Set(Object.keys(defaultConfiguration));
		const removedKeys = rawKeys.filter((key) => !validKeys.has(key));

		if (removedKeys.length > 0) {
			await chrome.storage.local.remove(removedKeys);
		}
		await setModifiedSettings(settings);
	} catch (error) {
		console.error("Failed to update stored settings:", error);
	}
}

async function getStoredSettings(): Promise<configuration> {
	return new Promise((resolve, reject) => {
		void chrome.storage.local.get<configuration>((settings) => {
			try {
				const storedSettings: Partial<configuration> = Object.keys(settings).reduce(
					(acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }),
					{}
				);
				resolve(storedSettings as configuration);
			} catch (error) {
				reject(error instanceof Error ? error : new Error("unknown error"));
			}
		});
	});
}

async function setModifiedSettings(settings: Partial<configuration>) {
	const updates: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(settings)) {
		updates[key] = value;
	}
	await chrome.storage.local.set(updates);
}
