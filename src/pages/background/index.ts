import type { ContentToBackgroundSendOnlyMessageMappings } from "@/src/types";

import { updateStoredSettings } from "@/src/utils/updateStoredSettings";

import { version } from "../../../package.json";
import { setDefaultValues } from "../../defaults";
chrome.runtime.onInstalled.addListener(async (details) => {
	const { open_settings_on_major_or_minor_version_change: openSettingsOnMajorOrMinorUpdate } = (await setDefaultValues().catch(() => void 0)) ?? {};
	const { previousVersion, reason } = details;
	console.log(`Previous version: ${previousVersion}, Reason: ${reason}`, openSettingsOnMajorOrMinorUpdate);
	if (!openSettingsOnMajorOrMinorUpdate) return;
	switch (reason) {
		case chrome.runtime.OnInstalledReason.INSTALL: {
			// Open the options page after install
			void chrome.tabs.create({ url: "/src/pages/options/index.html" });
			break;
		}
		case chrome.runtime.OnInstalledReason.UPDATE: {
			if (!previousVersion) return;
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

function isNewMajorVersion(oldVersion: VersionString, newVersion: VersionString) {
	const [oldMajorVersion] = oldVersion.split(".");
	const [newMajorVersion] = newVersion.split(".");
	return oldMajorVersion !== newMajorVersion;
}
function isNewMinorVersion(oldVersion: VersionString, newVersion: VersionString) {
	const [, oldMinorVersion] = oldVersion.split(".");
	const [, newMinorVersion] = newVersion.split(".");
	return oldMinorVersion !== newMinorVersion;
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
