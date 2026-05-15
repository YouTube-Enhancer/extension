import browser from "webextension-polyfill";

import type { configuration } from "@/src/types";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { isLegacyConfiguration, migrateConfiguration, parseStoredValue } from "@/src/utils/config/utils";
/**
 * Sets the modified settings in the browser storage.
 * @param {Partial<configuration>} settings The modified settings to be stored.
 */
export async function setModifiedSettings(settings: Partial<configuration>) {
	const updates: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(settings)) {
		updates[key] = value;
	}
	await browser.storage.local.set(updates);
}

/**
 * Updates the stored settings by migrating any legacy settings to the new format,
 * removing any invalid keys, and saving the resulting settings to local storage.
 * @returns {Promise<configuration>} - a promise that resolves with the updated configuration
 */
export async function updateStoredSettings() {
	const defaultConfiguration = getDefaultConfiguration();
	try {
		const rawStorage = await browser.storage.local.get(null);
		const rawKeys = Object.keys(rawStorage);
		let settings = await getStoredSettings();
		if (isLegacyConfiguration(settings)) {
			settings = migrateConfiguration(settings, defaultConfiguration);
		}
		const validKeys = new Set([...Object.keys(defaultConfiguration), ...metadataRegistry.getAll().map((feature) => `state:${feature.id}` as const)]);
		const removedKeys = rawKeys.filter((key) => !validKeys.has(key));

		if (removedKeys.length > 0) {
			await browser.storage.local.remove(removedKeys);
		}
		await setModifiedSettings(settings);
	} catch (error) {
		console.error("Failed to update stored settings:", error);
	}
}

/**
 * Retrieves the stored settings from local storage.
 * @returns {Promise<configuration>} - a promise that resolves with the stored configuration
 */
async function getStoredSettings(): Promise<configuration> {
	return new Promise((resolve, reject) => {
		void browser.storage.local.get().then((settings) => {
			try {
				const storedSettings: Partial<configuration> = Object.keys(settings).reduce(
					(acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }),
					{}
				);
				return resolve(storedSettings as configuration);
			} catch (error) {
				return reject(error instanceof Error ? error : new Error("unknown error"));
			}
		});
	});
}
