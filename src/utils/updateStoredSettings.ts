import type { configuration, configurationKeys } from "@/src/types";

import { defaultConfiguration } from "@/src/utils/constants";
import { parseStoredValue } from "@/src/utils/utilities";

const changedKeys = Object.keys({
	osd_display_type: ""
} satisfies Partial<Record<configurationKeys, "">>);

export async function updateStoredSettings() {
	try {
		const settings = await getStoredSettings();
		const removedKeys = Object.keys(settings).filter((key) => !Object.keys(defaultConfiguration).includes(key));
		for (const changedKey of changedKeys) {
			switch (changedKey) {
				case "osd_display_type": {
					if ((settings.osd_display_type as unknown as string) === "round") {
						settings.osd_display_type = "circle";
					}
					break;
				}
			}
		}
		for (const key of removedKeys) {
			delete settings[key];
		}
		await setModifiedSettings(settings);
	} catch (error) {
		console.error("Failed to update stored settings:", error);
	}
}

async function getStoredSettings(): Promise<configuration> {
	return new Promise((resolve, reject) => {
		void chrome.storage.local.get((settings) => {
			try {
				const storedSettings: Partial<configuration> = (
					Object.keys(settings)
						.filter((key) => typeof key === "string")
						.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string)) as configurationKeys[]
				).reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
				const castedSettings = storedSettings as configuration;
				resolve(castedSettings);
			} catch (error) {
				reject(error);
			}
		});
	});
}

async function setModifiedSettings(settings: Partial<configuration>) {
	const updates: Record<string, string> = {};
	for (const [key, value] of Object.entries(settings)) {
		updates[key] = typeof value !== "string" ? JSON.stringify(value) : value;
	}
	await chrome.storage.local.set(updates);
}
