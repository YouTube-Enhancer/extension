import type { ContentToBackgroundSendOnlyMessages, DevToolsMessages, Nullable } from "@/src/types";

import { setDefaultValues } from "@/src/defaults";
import { DEV_MODE } from "@/src/utils/config/env";
import { updateStoredSettings } from "@/src/utils/config/storage";
import {
	reinjectContentScriptsAfterReload,
	startHotReloadClient
} from "@/src/utils/dev/hotReloadClient";

import { version } from "../../../package.json";

const sentRequestIds = new Set<string>();
/** Bounds the devtools requestId dedup set so page-relayed requests cannot grow it forever. */
const MAX_TRACKED_REQUEST_IDS = 5000;

/**
 * Static import on purpose. A dynamic import here made the pages build emit
 * `__vitePreload` into the service worker graph, and Rolldown hosted that helper
 * in the Monaco vendor chunk (`window` is not defined in a service worker).
 * Production tree-shakes this call; Monaco never belongs on the SW import path.
 */
if (DEV_MODE) {
	startHotReloadClient();
	void reinjectContentScriptsAfterReload();
}

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
chrome.runtime.onMessage.addListener(
	(
		message: ContentToBackgroundSendOnlyMessages | DevToolsMessages["request"],
		sender,
		sendResponse
	) => {
		const { source, type } = message;

		if (source === "devtools" && typeof type === "string" && type.startsWith("devtools_")) {
			/**
			 * DevTools requests originate from the extension's own devtools pages. A tab sender
			 * means the message was relayed from page context, which is not an authorized source:
			 * the page-controlled fields (source, type) are not authentication.
			 */
			if (sender.tab) return false;
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

					sendResponse({
						action: "data_response",
						data: { ok: true },
						requestId,
						source: "background",
						tabId: 0,
						type
					});
				});
				return true;
			}

			// Deduplicate: skip if we already sent this requestId. The set is bounded so
			// page-relayed requests cannot grow it without limit.
			if (requestId && sentRequestIds.has(requestId)) return true;
			if (requestId) {
				if (sentRequestIds.size >= MAX_TRACKED_REQUEST_IDS) sentRequestIds.clear();
				sentRequestIds.add(requestId);
			}

			chrome.tabs.query({ url: "https://*.youtube.com/*" }, (tabs) => {
				const targetTab = tabId !== undefined ? tabs.find((t) => t.id === tabId) : tabs[0];
				if (!targetTab?.id) {
					return sendResponse({
						action: "data_response",
						data: null,
						requestId: requestId ?? "",
						source: "background",
						tabId: 0,
						type
					});
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
				const senderTabId = sender.tab?.id;
				/**
				 * The stored feature policy is enforced here, not only at the message source: the
				 * content script relays page-originated messages, and a disabled feature must not
				 * pause other tabs no matter what a page sends.
				 */
				void (async () => {
					let enabled = false;
					try {
						const stored = await chrome.storage.local.get("pauseBackgroundPlayers");
						const config = stored.pauseBackgroundPlayers as undefined | { enabled?: unknown };
						enabled = config?.enabled === true;
					} catch (error) {
						console.error("[Background] Failed to read pauseBackgroundPlayers config:", error);
						return;
					}
					if (!enabled) return;
					chrome.tabs.query({ url: "https://www.youtube.com/*" }, (tabs) => {
						for (const tab of tabs) {
							if (tab.id === senderTabId) continue;
							if (tab.id !== undefined) {
								chrome.scripting.executeScript(
									{
										func: () => {
											const hasVideoPiP =
												"pictureInPictureElement" in document && !!document.pictureInPictureElement;
											const hasDocumentPiP =
												"documentPictureInPicture" in window &&
												!!(
													window as Window & {
														documentPictureInPicture?: { window: Nullable<Window> };
													}
												).documentPictureInPicture?.window;
											if (hasVideoPiP || hasDocumentPiP) return;
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
												console.log("[Background] Paused audios in tab:", {
													results: results[0].result,
													tabId: tab.id
												});
											}
										}
									}
								);
							}
						}
					});
				})();
				break;
			}
		}
	}
);
