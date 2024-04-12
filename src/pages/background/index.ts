import type { ContentToBackgroundSendOnlyMessageMappings, configuration, configurationKeys } from "@/src/types";

import { defaultConfiguration } from "@/src/utils/constants";
import { parseStoredValue } from "@/src/utils/utilities";

import pkg from "../../../package.json";

chrome.runtime.onInstalled.addListener((details) => {
	const { previousVersion, reason } = details;
	if (!previousVersion) return;
	switch (reason) {
		case chrome.runtime.OnInstalledReason.INSTALL: {
			// Open the options page after install
			void chrome.tabs.create({ url: "/src/pages/options/index.html" });
			break;
		}
		case chrome.runtime.OnInstalledReason.UPDATE: {
			const { version } = pkg;
			if (
				isNewMajorVersion(previousVersion as VersionString, version as VersionString) ||
				isNewMinorVersion(previousVersion as VersionString, version as VersionString)
			) {
				// Open options page if a new major or minor version is released
				void chrome.tabs.create({ url: "/src/pages/options/index.html" });
			}
			void updateStoredSettings();
			break;
		}
	}
});
type VersionString = `${string}.${string}.${string}`;

function isNewMinorVersion(oldVersion: VersionString, newVersion: VersionString) {
	const [, oldMinorVersion] = oldVersion.split(".");
	const [, newMinorVersion] = newVersion.split(".");
	return oldMinorVersion !== newMinorVersion;
}
function isNewMajorVersion(oldVersion: VersionString, newVersion: VersionString) {
	const [oldMajorVersion] = oldVersion.split(".");
	const [newMajorVersion] = newVersion.split(".");
	return oldMajorVersion !== newMajorVersion;
}
chrome.runtime.onMessage.addListener((message: ContentToBackgroundSendOnlyMessageMappings[keyof ContentToBackgroundSendOnlyMessageMappings]) => {
	switch (message.type) {
		case "pauseBackgroundPlayers": {
			// Get the active tab's ID
			chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
				const [activeTab] = activeTabs;
				const { id: activeTabId } = activeTab;
				// Query all tabs except the active one
				chrome.tabs.query({ url: "https://www.youtube.com/*" }, (tabs) => {
					for (const tab of tabs) {
						// Skip the active tab
						if (tab.id === activeTabId) continue;
						if (tab.id !== undefined) {
							chrome.scripting.executeScript(
								{
									func: () => {
										const videos = document.querySelectorAll("video");
										videos.forEach((video) => {
											if (!video.paused) {
												video.pause();
											}
										});
										const audios = document.querySelectorAll("audio");
										audios.forEach((audio) => {
											if (!audio.paused) {
												audio.pause();
											}
										});
									},
									target: { tabId: tab.id }
								},
								(results) => {
									if (chrome.runtime.lastError) {
										console.error(chrome.runtime.lastError.message);
									} else {
										if (results[0].result) {
											console.log(results);
										}
									}
								}
							);
						}
					}
				});
			});
			break;
		}
	}
});
const changedKeys = Object.keys({
	osd_display_type: ""
} satisfies Partial<Record<configurationKeys, "">>);
async function updateStoredSettings() {
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
async function setModifiedSettings(settings: Partial<configuration>) {
	const updates: Record<string, string> = {};
	for (const [key, value] of Object.entries(settings)) {
		updates[key] = typeof value !== "string" ? JSON.stringify(value) : value;
	}
	await chrome.storage.local.set(updates);
}
async function getStoredSettings(): Promise<configuration> {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get((settings) => {
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
