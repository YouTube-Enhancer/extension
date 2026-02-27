import type { AvailableLocales } from "@/src/i18n/constants";

import { getVideoHistory, setVideoHistory } from "@/src/features/videoHistory/utils";
import {
	type AllButtonNames,
	buttonNames,
	type ButtonPlacement,
	type configuration,
	type ContentSendOnlyMessageMappings,
	type ContentToBackgroundSendOnlyMessageMappings,
	type ExtensionSendOnlyMessageMappings,
	type Messages,
	type Path,
	type PathValue,
	type RememberedVolumes,
	type StorageChanges
} from "@/src/types";
import { defaultConfiguration } from "@/src/utils/constants";
import { parseStoredValue, sendExtensionMessage, sendExtensionOnlyMessage } from "@/src/utils/utilities";
/**
 * Adds a script element to the document's root element, which loads a JavaScript file from the extension's runtime URL.
 * Also creates a hidden div element with a specific ID to receive messages from the extension.
 */
const script = document.createElement("script");
script.src = chrome.runtime.getURL("src/pages/embedded/index.js");
script.type = "text/javascript";
function initializeCommunicationElement() {
	const element = document.createElement("div");
	element.style.display = "none";
	element.id = "yte-message-from-extension";
	document.documentElement.appendChild(element);
}
initializeCommunicationElement();
document.documentElement.appendChild(script);
const getStoredSettings = async (): Promise<configuration> => {
	const options: configuration = await new Promise((resolve) => {
		void chrome.storage.local.get<configuration>((settings) => {
			const storedSettings: Partial<configuration> = Object.keys(settings)
				.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string))
				.reduce((acc, key) => Object.assign(acc, { [key]: settings[key] }), {});
			resolve(storedSettings as configuration);
		});
	});
	return options;
};
void (async () => {
	const options = await getStoredSettings();
	void sendExtensionMessage("options", "data_response", { options });
})();

/**
 * Listens for the "yte-message-from-youtube" event and handles incoming messages from the YouTube page.
 *
 * @returns {void}
 */
document.addEventListener("yte-message-from-youtube", () => {
	void (async () => {
		const provider = document.querySelector("#yte-message-from-youtube");
		if (!provider) return;
		const { textContent: stringifiedMessage } = provider;
		if (!stringifiedMessage) return;
		let message;
		try {
			message = JSON.parse(stringifiedMessage) as
				| ContentSendOnlyMessageMappings[keyof ContentSendOnlyMessageMappings]
				| ContentToBackgroundSendOnlyMessageMappings[keyof ContentToBackgroundSendOnlyMessageMappings]
				| Messages["request"];
		} catch (error) {
			console.error(error);
			return;
		}
		if (!message) return;
		switch (message.action) {
			case "request_action": {
				await chrome.runtime.sendMessage(message);
				break;
			}
			case "request_data": {
				switch (message.type) {
					case "extensionURL": {
						void sendExtensionMessage("extensionURL", "data_response", {
							extensionURL: chrome.runtime.getURL("")
						});
						break;
					}
					case "language": {
						const language = await new Promise<AvailableLocales>((resolve) => {
							chrome.storage.local.get("language", (o) => {
								resolve(o.language as AvailableLocales);
							});
						});
						void sendExtensionMessage("language", "data_response", {
							language
						});
						break;
					}
					case "options": {
						/**
						 * Retrieves the options from the local storage and sends them back to the youtube page.
						 *
						 * @type {configuration}
						 */
						const options: configuration = await new Promise((resolve) => {
							void chrome.storage.local.get<configuration>((settings) => {
								const storedSettings: Partial<configuration> = Object.keys(settings)
									.filter((key) => typeof key === "string")
									.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string))
									.reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
								resolve(storedSettings as configuration);
							});
						});
						void sendExtensionMessage("options", "data_response", { options });
						break;
					}
					case "videoHistoryAll": {
						const videoHistory = getVideoHistory();
						void sendExtensionMessage("videoHistoryAll", "data_response", {
							video_history_entries: videoHistory
						});
						break;
					}
					case "videoHistoryOne": {
						const { data } = message;
						if (!data) return;
						const { id } = data;
						const videoHistory = getVideoHistory();
						void sendExtensionMessage("videoHistoryOne", "data_response", {
							video_history_entry: videoHistory[id]
						});
						break;
					}
				}
				break;
			}
			case "send_data": {
				switch (message.type) {
					case "pageLoaded": {
						chrome.storage.onChanged.addListener(storageListeners);
						window.addEventListener("pagehide", () => {
							chrome.storage.onChanged.removeListener(storageListeners);
						});
						break;
					}
					case "setRememberedVolume": {
						const { remembered_volumes: existingRememberedVolumeStringified } = await chrome.storage.local.get("remembered_volumes");
						const existingRememberedVolumes = parseStoredValue(existingRememberedVolumeStringified as string) as RememberedVolumes;
						void chrome.storage.local.set({ remembered_volumes: { ...existingRememberedVolumes, ...message.data } });
						break;
					}
					case "setVolumeBoostAmount": {
						void chrome.storage.local.set({ volume_boost_amount: message.data });
						break;
					}
					case "videoHistoryOne": {
						const { data } = message;
						if (!data) return;
						const { video_history_entry } = data;
						if (!video_history_entry) return;
						const { id, status, timestamp } = video_history_entry;
						setVideoHistory(id, timestamp, status);
						break;
					}
				}
			}
		}
	})();
});
const storageListeners = (changes: StorageChanges, areaName: string) => {
	if (areaName !== "local") return;
	const changeKeys = Object.keys(changes).filter((key): key is keyof configuration => key in defaultConfiguration);
	if (!changeKeys.length) return;
	void storageChangeHandler(changes, areaName);
};
const deepEqual = (a: unknown, b: unknown): boolean => {
	if (a === b) return true;
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
		return false;
	}
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	for (const key of keysA) {
		if (!keysB.includes(key)) return false;
		if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
	}
	return true;
};
const isValidChange = (change?: { newValue?: unknown; oldValue?: unknown }) => {
	if (change?.newValue === undefined || change?.oldValue === undefined) return false;
	return !deepEqual(change.oldValue, change.newValue);
};
const castStorageChanges = (changes: StorageChanges) => {
	const result: Partial<{ [K in keyof configuration]: { newValue?: unknown; oldValue?: unknown } }> = {};
	for (const [key, change] of Object.entries(changes)) {
		if (key in defaultConfiguration) {
			const typedKey = key as keyof configuration;
			result[typedKey] = change as { newValue?: unknown; oldValue?: unknown };
		}
	}
	return result;
};

type PathEvent<P extends Path<configuration>, E extends keyof ExtensionSendOnlyMessageMappings> = {
	build: (args: {
		newValue: PathValue<configuration, P>;
		oldValue: PathValue<configuration, P>;
		options: configuration;
		path: P;
	}) => ExtensionSendOnlyMessageMappings[E]["data"];
	event: E;
};
function getProp(obj: unknown, key: string): unknown {
	return isRecord(obj) ? obj[key] : undefined;
}
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
const pathHandlers: {
	[P in Path<configuration>]?: PathEvent<P, keyof ExtensionSendOnlyMessageMappings>;
} = {
	"automaticallyDisableAmbientMode.enabled": {
		build: ({ newValue }) => ({
			automaticallyDisableAmbientModeEnabled: newValue
		}),
		event: "automaticallyDisableAmbientModeChange"
	},
	"automaticallyDisableAutoPlay.enabled": {
		build: ({ newValue }) => ({
			automaticallyDisableAutoPlayEnabled: newValue
		}),
		event: "automaticallyDisableAutoPlayChange"
	},
	"automaticallyDisableClosedCaptions.enabled": {
		build: ({ newValue }) => ({
			automaticallyDisableClosedCaptionsEnabled: newValue
		}),
		event: "automaticallyDisableClosedCaptionsChange"
	},
	"automaticallyEnableClosedCaptions.enabled": {
		build: ({ newValue }) => ({
			automaticallyEnableClosedCaptionsEnabled: newValue
		}),
		event: "automaticallyEnableClosedCaptionsChange"
	},
	"automaticallyMaximizePlayer.enabled": {
		build: ({ newValue }) => ({
			automaticallyMaximizePlayerEnabled: newValue
		}),
		event: "automaticallyMaximizePlayerChange"
	},
	"automaticallyShowMoreVideosOnEndScreen.enabled": {
		build: ({ newValue }) => ({
			automaticallyShowMoreVideosOnEndScreenEnabled: newValue
		}),
		event: "automaticallyShowMoreVideosOnEndScreenChange"
	},
	"automaticTheaterMode.enabled": {
		build: ({ newValue }) => ({
			automaticTheaterModeEnabled: newValue
		}),
		event: "automaticTheaterModeChange"
	},
	"blockNumberKeySeeking.enabled": {
		build: ({ newValue }) => ({
			blockNumberKeySeekingEnabled: newValue
		}),
		event: "blockNumberKeySeekingChange"
	},
	buttonPlacement: {
		build: ({ newValue, oldValue }) => ({
			buttonPlacement: buttonNames.reduce(
				(acc, feature) => {
					const { [feature]: oldPlacement } = oldValue;
					const { [feature]: newPlacement } = newValue;
					return Object.assign(acc, {
						[feature]: {
							new: newPlacement,
							old: oldPlacement
						}
					});
				},
				{} as Record<AllButtonNames, { new: ButtonPlacement; old: ButtonPlacement }>
			)
		}),
		event: "buttonPlacementChange"
	},
	"copyTimestampUrlButton.enabled": {
		build: ({ newValue }) => ({
			copyTimestampUrlButtonEnabled: newValue
		}),
		event: "copyTimestampUrlButtonChange"
	},
	"customCSS.code": {
		build: ({ newValue, options }) => ({
			customCSSCode: newValue,
			customCSSEnabled: options.customCSS.enabled
		}),
		event: "customCSSChange"
	},
	"customCSS.enabled": {
		build: ({ newValue, options }) => ({
			customCSSCode: options.customCSS.code,
			customCSSEnabled: newValue
		}),
		event: "customCSSChange"
	},
	"deepDarkCSS.colors": {
		build: ({ newValue, options }) => ({
			deepDarkCustomThemeColors: newValue,
			deepDarkPreset: options.deepDarkCSS.preset,
			deepDarkThemeEnabled: options.deepDarkCSS.enabled
		}),
		event: "deepDarkThemeChange"
	},
	"deepDarkCSS.enabled": {
		build: ({ newValue, options }) => ({
			deepDarkCustomThemeColors: options.deepDarkCSS.colors,
			deepDarkPreset: options.deepDarkCSS.preset,
			deepDarkThemeEnabled: newValue
		}),
		event: "deepDarkThemeChange"
	},
	"deepDarkCSS.preset": {
		build: ({ newValue, options }) => ({
			deepDarkCustomThemeColors: options.deepDarkCSS.colors,
			deepDarkPreset: newValue,
			deepDarkThemeEnabled: options.deepDarkCSS.enabled
		}),
		event: "deepDarkThemeChange"
	},
	"defaultToOriginalAudioTrack.enabled": {
		build: ({ newValue }) => ({
			defaultToOriginalAudioTrackEnabled: newValue
		}),
		event: "defaultToOriginalAudioTrackChange"
	},
	"featureMenu.openType": {
		build: ({ newValue }) => ({
			featureMenuOpenType: newValue
		}),
		event: "featureMenuOpenTypeChange"
	},
	"flipVideoButtons.flipHorizontal.enabled": {
		build: ({ newValue }) => ({
			flipVideoHorizontalButtonEnabled: newValue
		}),
		event: "flipVideoHorizontalButtonChange"
	},
	"flipVideoButtons.flipVertical.enabled": {
		build: ({ newValue }) => ({
			flipVideoVerticalButtonEnabled: newValue
		}),
		event: "flipVideoVerticalButtonChange"
	},
	"forwardRewindButtons.enabled": {
		build: ({ newValue }) => ({
			forwardRewindButtonsEnabled: newValue
		}),
		event: "forwardRewindButtonsChange"
	},
	"forwardRewindButtons.time": {
		build: () => ({
			forwardRewindButtonsEnabled: true
		}),
		event: "forwardRewindButtonsChange"
	},
	"globalVolume.enabled": {
		build: ({ newValue }) => ({
			globalVolumeEnabled: newValue
		}),
		event: "globalVolumeChange"
	},
	"hideArtificialIntelligenceSummary.enabled": {
		build: ({ newValue }) => ({
			hideArtificialIntelligenceSummaryEnabled: newValue
		}),
		event: "hideArtificialIntelligenceSummaryChange"
	},
	"hideEndScreenCards.enabled": {
		build: ({ newValue, options }) => ({
			hideEndScreenCardsButtonPlacement: options.buttonPlacement["hideEndScreenCardsButton"],
			hideEndScreenCardsEnabled: newValue
		}),
		event: "hideEndScreenCardsChange"
	},
	"hideEndScreenCardsButton.enabled": {
		build: ({ newValue }) => ({
			hideEndScreenCardsButtonEnabled: newValue
		}),
		event: "hideEndScreenCardsButtonChange"
	},
	"hideLiveStreamChat.enabled": {
		build: ({ newValue }) => ({
			hideLiveStreamChatEnabled: newValue
		}),
		event: "hideLiveStreamChatChange"
	},
	"hideMembersOnlyVideos.enabled": {
		build: ({ newValue }) => ({
			hideMembersOnlyVideosEnabled: newValue
		}),
		event: "hideMembersOnlyVideosChange"
	},
	"hideOfficialArtistVideosFromHomePage.enabled": {
		build: ({ newValue }) => ({
			hideOfficialArtistVideosFromHomePageEnabled: newValue
		}),
		event: "hideOfficialArtistVideosFromHomePageChange"
	},
	"hidePaidPromotionBanner.enabled": {
		build: ({ newValue }) => ({
			hidePaidPromotionBannerEnabled: newValue
		}),
		event: "hidePaidPromotionBannerChange"
	},
	"hidePlayables.enabled": {
		build: ({ newValue }) => ({
			hidePlayablesEnabled: newValue
		}),
		event: "hidePlayablesChange"
	},
	"hidePlaylistRecommendationsFromHomePage.enabled": {
		build: ({ newValue }) => ({
			hidePlaylistRecommendationsFromHomePageEnabled: newValue
		}),
		event: "hidePlaylistRecommendationsFromHomePageChange"
	},
	"hideScrollBar.enabled": {
		build: ({ newValue }) => ({
			hideScrollBarEnabled: newValue
		}),
		event: "hideScrollBarChange"
	},
	"hideShorts.channel.enabled": {
		build: ({ newValue, options }) => ({
			enableHideShortsChannel: newValue,
			enableHideShortsHome: options.hideShorts.home.enabled,
			enableHideShortsSearch: options.hideShorts.search.enabled,
			enableHideShortsSidebar: options.hideShorts.sidebar.enabled,
			enableHideShortsVideos: options.hideShorts.videos.enabled
		}),
		event: "hideShortsChange"
	},
	"hideShorts.home.enabled": {
		build: ({ newValue, options }) => ({
			enableHideShortsChannel: options.hideShorts.channel.enabled,
			enableHideShortsHome: newValue,
			enableHideShortsSearch: options.hideShorts.search.enabled,
			enableHideShortsSidebar: options.hideShorts.sidebar.enabled,
			enableHideShortsVideos: options.hideShorts.videos.enabled
		}),
		event: "hideShortsChange"
	},
	"hideShorts.search.enabled": {
		build: ({ newValue, options }) => ({
			enableHideShortsChannel: options.hideShorts.channel.enabled,
			enableHideShortsHome: options.hideShorts.home.enabled,
			enableHideShortsSearch: newValue,
			enableHideShortsSidebar: options.hideShorts.sidebar.enabled,
			enableHideShortsVideos: options.hideShorts.videos.enabled
		}),
		event: "hideShortsChange"
	},
	"hideShorts.sidebar.enabled": {
		build: ({ newValue, options }) => ({
			enableHideShortsChannel: options.hideShorts.channel.enabled,
			enableHideShortsHome: options.hideShorts.home.enabled,
			enableHideShortsSearch: options.hideShorts.search.enabled,
			enableHideShortsSidebar: newValue,
			enableHideShortsVideos: options.hideShorts.videos.enabled
		}),
		event: "hideShortsChange"
	},
	"hideShorts.videos.enabled": {
		build: ({ newValue, options }) => ({
			enableHideShortsChannel: options.hideShorts.channel.enabled,
			enableHideShortsHome: options.hideShorts.home.enabled,
			enableHideShortsSearch: options.hideShorts.search.enabled,
			enableHideShortsSidebar: options.hideShorts.sidebar.enabled,
			enableHideShortsVideos: newValue
		}),
		event: "hideShortsChange"
	},
	"hideSidebarRecommendedVideos.enabled": {
		build: ({ newValue }) => ({
			hideSidebarRecommendedVideosEnabled: newValue
		}),
		event: "hideSidebarRecommendedVideosChange"
	},
	"hideTranslateComment.enabled": {
		build: ({ newValue }) => ({
			hideTranslateCommentEnabled: newValue
		}),
		event: "hideTranslateCommentChange"
	},
	language: {
		build: ({ newValue }) => ({
			language: newValue
		}),
		event: "languageChange"
	},
	"loopButton.enabled": {
		build: ({ newValue }) => ({
			loopButtonEnabled: newValue
		}),
		event: "loopButtonChange"
	},
	"maximizePlayerButton.enabled": {
		build: ({ newValue }) => ({
			maximizePlayerButtonEnabled: newValue
		}),
		event: "maximizeButtonChange"
	},
	"miniPlayer.defaultPosition": {
		build: ({ newValue, options }) => ({
			defaultPosition: newValue,
			defaultSize: options.miniPlayer.defaultSize
		}),
		event: "miniPlayerDefaultsChange"
	},
	"miniPlayer.defaultSize": {
		build: ({ newValue, options }) => ({
			defaultPosition: options.miniPlayer.defaultPosition,
			defaultSize: newValue
		}),
		event: "miniPlayerDefaultsChange"
	},
	"miniPlayer.enabled": {
		build: ({ newValue }) => ({
			miniPlayerEnabled: newValue
		}),
		event: "commentsMiniPlayerChange"
	},
	"miniPlayerButton.enabled": {
		build: ({ newValue }) => ({
			miniPlayerButtonEnabled: newValue
		}),
		event: "miniPlayerButtonChange"
	},
	"monoToStereoButton.enabled": {
		build: ({ newValue }) => ({
			monoToStereoButtonEnabled: newValue
		}),
		event: "monoToStereoButtonChange"
	},
	"openTranscriptButton.enabled": {
		build: ({ newValue }) => ({
			openTranscriptButtonEnabled: newValue
		}),
		event: "openTranscriptButtonChange"
	},
	"openYouTubeSettingsOnHover.enabled": {
		build: ({ newValue }) => ({
			openYouTubeSettingsOnHoverEnabled: newValue
		}),
		event: "openYTSettingsOnHoverChange"
	},
	"pauseBackgroundPlayers.enabled": {
		build: ({ newValue }) => ({
			pauseBackgroundPlayersEnabled: newValue
		}),
		event: "pauseBackgroundPlayersChange"
	},
	"playbackSpeedButtons.enabled": {
		build: ({ newValue, options }) => ({
			playbackButtonsSpeed: options.playbackSpeedButtons.speed,
			playbackSpeedButtonsEnabled: newValue
		}),
		event: "playbackSpeedButtonsChange"
	},
	"playbackSpeedButtons.speed": {
		build: ({ newValue, options }) => ({
			playbackButtonsSpeed: newValue,
			playbackSpeedButtonsEnabled: options.playbackSpeedButtons.enabled
		}),
		event: "playbackSpeedButtonsChange"
	},
	"playerSpeed.enabled": {
		build: ({ newValue, options }) => ({
			enableForcedPlaybackSpeed: newValue,
			playerSpeed: options.playerSpeed.speed
		}),
		event: "playerSpeedChange"
	},
	"playerSpeed.speed": {
		build: ({ newValue, options }) => ({
			enableForcedPlaybackSpeed: options.playerSpeed.enabled,
			playerSpeed: newValue
		}),
		event: "playerSpeedChange"
	},
	"playlistLength.enabled": {
		build: ({ newValue }) => ({
			playlistLengthEnabled: newValue
		}),
		event: "playlistLengthChange"
	},
	"playlistLength.lengthGetMethod": {
		build: () => undefined,
		event: "playlistLengthGetMethodChange"
	},
	"playlistLength.watchTimeGetMethod": {
		build: () => undefined,
		event: "playlistWatchTimeGetMethodChange"
	},
	"playlistManagementButtons.removeButton.enabled": {
		build: ({ newValue }) => ({
			playlistRemoveButtonEnabled: newValue
		}),
		event: "playlistRemoveButtonChange"
	},
	"playlistManagementButtons.resetButton.enabled": {
		build: ({ newValue }) => ({
			playlistResetButtonEnabled: newValue
		}),
		event: "playlistResetButtonChange"
	},
	"remainingTime.enabled": {
		build: ({ newValue }) => ({
			remainingTimeEnabled: newValue
		}),
		event: "remainingTimeChange"
	},
	"rememberVolume.enabled": {
		build: ({ newValue }) => ({
			rememberVolumeEnabled: newValue
		}),
		event: "rememberVolumeChange"
	},
	"removeRedirect.enabled": {
		build: ({ newValue }) => ({
			removeRedirectEnabled: newValue
		}),
		event: "removeRedirectChange"
	},
	"restoreFullscreenScrolling.enabled": {
		build: ({ newValue }) => ({
			restoreFullscreenScrollingEnabled: newValue
		}),
		event: "restoreFullscreenScrollingChange"
	},
	"saveToWatchLaterButton.enabled": {
		build: ({ newValue }) => ({
			saveToWatchLaterButtonEnabled: newValue
		}),
		event: "saveToWatchLaterButtonChange"
	},
	"screenshotButton.enabled": {
		build: ({ newValue }) => ({
			screenshotButtonEnabled: newValue
		}),
		event: "screenshotButtonChange"
	},
	"scrollWheelSpeedControl.enabled": {
		build: ({ newValue }) => ({
			scrollWheelSpeedControlEnabled: newValue
		}),
		event: "scrollWheelSpeedControlChange"
	},
	"scrollWheelVolumeControl.enabled": {
		build: ({ newValue }) => ({
			scrollWheelVolumeControlEnabled: newValue
		}),
		event: "scrollWheelVolumeControlChange"
	},
	"shareShortener.enabled": {
		build: ({ newValue }) => ({
			shareShortenerEnabled: newValue
		}),
		event: "shareShortenerChange"
	},
	"shortsAutoScroll.enabled": {
		build: ({ newValue }) => ({
			shortsAutoScrollEnabled: newValue
		}),
		event: "shortsAutoScrollChange"
	},
	"skipContinueWatching.enabled": {
		build: ({ newValue }) => ({
			skipContinueWatchingEnabled: newValue
		}),
		event: "skipContinueWatchingChange"
	},
	"timestampPeek.enabled": {
		build: ({ newValue }) => ({
			timestampPeekEnabled: newValue
		}),
		event: "timestampPeekChange"
	},
	"videoHistory.enabled": {
		build: ({ newValue }) => ({
			videoHistoryEnabled: newValue
		}),
		event: "videoHistoryChange"
	},
	"volumeBoost.amount": {
		build: ({ options }) => ({
			volumeBoostEnabled: options.volumeBoost.enabled,
			volumeBoostMode: options.volumeBoost.mode
		}),
		event: "volumeBoostChange"
	},
	"volumeBoost.enabled": {
		build: ({ newValue, options }) => ({
			volumeBoostEnabled: newValue,
			volumeBoostMode: options.volumeBoost.mode
		}),
		event: "volumeBoostChange"
	},
	"volumeBoost.mode": {
		build: ({ newValue, options }) => ({
			volumeBoostEnabled: options.volumeBoost.enabled,
			volumeBoostMode: newValue
		}),
		event: "volumeBoostChange"
	}
};

function emitPathEvent<P extends keyof typeof pathHandlers>({
	newValue,
	oldValue,
	options,
	path
}: {
	newValue: PathValue<configuration, P>;
	oldValue: PathValue<configuration, P>;
	options: configuration;
	path: P;
}): void {
	const { [path]: def } = pathHandlers;
	if (!def) return;

	sendExtensionOnlyMessage(def.event, def.build({ newValue, oldValue, options, path }));
}
const storageChangeHandler = async (changes: StorageChanges, areaName: string) => {
	if (areaName !== "local") return;

	const castedChanges = castStorageChanges(changes);
	const options = await getStoredSettings();
	handleConfigChanges(castedChanges, ({ newValue, oldValue, path }) => {
		emitPathEvent({ newValue, oldValue, options, path });
	});
};
type ConfigPathChange<P extends keyof typeof pathHandlers> = {
	newValue: PathValue<configuration, P>;
	oldValue: PathValue<configuration, P>;
	path: P;
};

function handleConfigChanges(
	changes: Partial<Record<keyof configuration, chrome.storage.StorageChange>>,
	handler: <P extends keyof typeof pathHandlers>(change: ConfigPathChange<P>) => void
): void {
	for (const rootKey of Object.keys(changes)) {
		const { [rootKey]: change } = changes;
		if (!change) continue;

		// skip changes that are structurally equal
		if (!isValidChange({ newValue: change.newValue, oldValue: change.oldValue })) continue;

		const walk = (oldObj: unknown, newObj: unknown, path: string): void => {
			if (deepEqual(oldObj, newObj)) return;

			handler({
				newValue: newObj as PathValue<configuration, keyof typeof pathHandlers>,
				oldValue: oldObj as PathValue<configuration, keyof typeof pathHandlers>,
				path: path as keyof typeof pathHandlers
			});

			if (typeof newObj !== "object" || newObj === null) return;

			for (const key of Object.keys(newObj)) {
				walk(getProp(oldObj, key), newObj[key], `${path}.${key}`);
			}
		};

		walk(change.oldValue, change.newValue, rootKey);
	}
}
