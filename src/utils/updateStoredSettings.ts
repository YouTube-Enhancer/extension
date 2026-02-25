import type { configuration } from "@/src/types";

import { defaultConfiguration } from "@/src/utils/constants";
import { parseStoredValue } from "@/src/utils/utilities";

export async function updateStoredSettings() {
	try {
		const rawStorage = await chrome.storage.local.get(null);
		const rawKeys = Object.keys(rawStorage);
		const settings = await getStoredSettings();
		const removedKeys = rawKeys.filter((key) => !(key in defaultConfiguration));
		if (removedKeys.length > 0) {
			await chrome.storage.local.remove(removedKeys);
		}
		const filteredSettings: Partial<configuration> = {};
		for (const key of Object.keys(defaultConfiguration) as Array<keyof configuration>) {
			const { [key]: value } = settings;
			if (value !== undefined) {
				Object.assign(filteredSettings, { [key]: value });
			}
		}
		await setModifiedSettings(filteredSettings);
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
