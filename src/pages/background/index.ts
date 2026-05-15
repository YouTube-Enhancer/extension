import type { ContentToBackgroundSendOnlyMessages, DevToolsMessages } from "@/src/types";

import { updateStoredSettings } from "@/src/utils/config/storage";

import { version } from "../../../package.json";
import { setDefaultValues } from "../../defaults";

const sentRequestIds = new Set<string>();

chrome.runtime.onInstalled.addListener((details) => {
	void (async () => {
		const { openSettingsOnMajorOrMinorVersionChange: openSettingsOnMajorOrMinorVersionChange } =
			(await setDefaultValues().catch((err) => {
				console.error("[Background] Failed to set default values:", err);
				return undefined;
			})) ?? {};
		const { previousVersion, reason } = details;
		if (!openSettingsOnMajorOrMinorVersionChange) return;
		switch (reason) {
			case "install": {
				// Open the options page after install
				void chrome.tabs.create({ url: "/src/pages/options/index.html" });
				break;
			}
			case "update": {
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
	})();
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
chrome.runtime.onMessage.addListener((message: ContentToBackgroundSendOnlyMessages | DevToolsMessages["request"], _sender, sendResponse) => {
	const { source, type } = message;

	if (source === "devtools" && typeof type === "string" && type.startsWith("devtools_")) {
		const { requestId, tabId } = message;
		if (type === "devtools_invalidate_cache") {
			const data = message;
			chrome.tabs.query({ url: "https://*.youtube.com/*" }, (tabs) => {
				for (const tab of tabs) {
					if (tab.id === undefined) continue;
					void chrome.tabs.sendMessage(tab.id, {
						action: "invalidate_cache",
						data: { keys: data.data?.keys },
						source: "background"
					});
				}

				sendResponse({ action: "data_response", data: { ok: true }, requestId, source: "background", tabId: 0, type });
			});
			return true;
		}

		// Deduplicate: skip if we already sent this requestId
		if (requestId && sentRequestIds.has(requestId)) return true;
		if (requestId) sentRequestIds.add(requestId);

		chrome.tabs.query({ url: "https://*.youtube.com/*" }, (tabs) => {
			const targetTab = tabId !== undefined ? tabs.find((t) => t.id === tabId) : tabs[0];
			if (!targetTab?.id) {
				return sendResponse({ action: "data_response", data: null, requestId: requestId ?? "", source: "background", tabId: 0, type });
			}
			return chrome.tabs.sendMessage(targetTab.id, message, (response: unknown) => {
				sendResponse(response);
			});
		});
		return true;
	}

	// Handle regular background messages
	const typedMessage = message as ContentToBackgroundSendOnlyMessages;
	switch (typedMessage.type) {
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
											console.log("[Background] Paused audios in tab:", { results: results[0].result, tabId: tab.id });
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
