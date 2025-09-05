import type { AvailableLocales } from "@/src/i18n/constants";

import { getVideoHistory, setVideoHistory } from "@/src/features/videoHistory/utils";
import {
	type AllButtonNames,
	buttonNames,
	type ButtonPlacement,
	type configuration,
	type configurationKeys,
	type ContentSendOnlyMessageMappings,
	type ContentToBackgroundSendOnlyMessageMappings,
	type Messages,
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

void (async () => {
	/**
	 * Retrieves the options from the local storage and sends them back to the youtube page.
	 *
	 * @type {configuration}
	 */
	const options: configuration = await new Promise((resolve) => {
		void chrome.storage.local.get<configuration>((settings) => {
			const storedSettings: Partial<configuration> = (
				Object.keys(settings)
					.filter((key) => typeof key === "string")
					.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string)) as configurationKeys[]
			).reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
			resolve(storedSettings as configuration);
		});
	});
	void void sendExtensionMessage("options", "data_response", { options });
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
								const storedSettings: Partial<configuration> = (
									Object.keys(settings)
										.filter((key) => typeof key === "string")
										.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string)) as configurationKeys[]
								).reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
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
						window.onunload = () => {
							chrome.storage.onChanged.removeListener(storageListeners);
						};
						break;
					}
					case "setRememberedVolume": {
						const { remembered_volumes: existingRememberedVolumeStringified } = await chrome.storage.local.get("remembered_volumes");
						const existingRememberedVolumes = parseStoredValue(existingRememberedVolumeStringified as string) as RememberedVolumes;
						void chrome.storage.local.set({ remembered_volumes: JSON.stringify({ ...existingRememberedVolumes, ...message.data }) });
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
	const changeKeys = Object.keys(
		changes as {
			[K in keyof configuration]?: {
				newValue: configuration[K] | undefined;
				oldValue: configuration[K] | undefined;
			};
		}
	);
	if (!changeKeys.length) return;
	void storageChangeHandler(changes, areaName);
};
const castStorageChanges = (changes: StorageChanges) => {
	return Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, change as { newValue?: unknown; oldValue?: unknown }])) as {
		[K in keyof configuration]: { newValue?: string; oldValue?: string };
	};
};
const getStoredSettings = async (): Promise<configuration> => {
	const options: configuration = await new Promise((resolve) => {
		void chrome.storage.local.get<configuration>((settings) => {
			const storedSettings: Partial<configuration> = (
				Object.keys(settings)
					.filter((key) => typeof key === "string")
					.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string)) as configurationKeys[]
			).reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
			resolve(storedSettings as configuration);
		});
	});
	return options;
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
	if (change?.newValue === undefined || change?.oldValue === undefined) {
		return false;
	}
	const parsedOldValue = parseStoredValue(change.oldValue as string);
	const parsedNewValue = parseStoredValue(change.newValue as string);
	return !deepEqual(parsedOldValue, parsedNewValue);
};
const storageChangeHandler = async (changes: StorageChanges, areaName: string) => {
	if (areaName !== "local") return;

	// Convert changes to a typed object
	const castedChanges = castStorageChanges(changes);

	// Get the current configuration options from local storage
	const options = await getStoredSettings();
	const keyActions: {
		[K in keyof configuration]?: (oldValue: configuration[K], newValue: configuration[K]) => void;
	} = {
		button_placements: (oldValue, newValue) => {
			sendExtensionOnlyMessage("buttonPlacementChange", {
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
			});
		},
		custom_css_code: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("customCSSChange", {
				customCSSCode: newValue,
				customCSSEnabled: options.enable_custom_css
			});
		},
		deep_dark_custom_theme_colors: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("deepDarkThemeChange", {
				deepDarkCustomThemeColors: newValue,
				deepDarkPreset: options.deep_dark_preset,
				deepDarkThemeEnabled: options.enable_deep_dark_theme
			});
		},
		deep_dark_preset: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("deepDarkThemeChange", {
				deepDarkCustomThemeColors: options.deep_dark_custom_theme_colors,
				deepDarkPreset: newValue,
				deepDarkThemeEnabled: options.enable_deep_dark_theme
			});
		},
		enable_automatic_theater_mode: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("automaticTheaterModeChange", {
				automaticTheaterModeEnabled: newValue
			});
		},
		enable_automatically_disable_ambient_mode: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("automaticallyDisableAmbientModeChange", {
				automaticallyDisableAmbientModeEnabled: newValue
			});
		},
		enable_automatically_disable_closed_captions: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("automaticallyDisableClosedCaptionsChange", {
				automaticallyDisableClosedCaptionsEnabled: newValue
			});
		},
		enable_copy_timestamp_url_button: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("copyTimestampUrlButtonChange", {
				copyTimestampUrlButtonEnabled: newValue
			});
		},
		enable_custom_css: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("customCSSChange", { customCSSCode: options.custom_css_code, customCSSEnabled: newValue });
		},
		enable_deep_dark_theme: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("deepDarkThemeChange", {
				deepDarkCustomThemeColors: options.deep_dark_custom_theme_colors,
				deepDarkPreset: options.deep_dark_preset,
				deepDarkThemeEnabled: newValue
			});
		},
		enable_default_to_original_audio_track(__oldValue, newValue) {
			sendExtensionOnlyMessage("defaultToOriginalAudioTrackChange", {
				defaultToOriginalAudioTrackEnabled: newValue
			});
		},
		enable_forced_playback_speed: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("playerSpeedChange", {
				enableForcedPlaybackSpeed: newValue,
				playerSpeed: options.player_speed
			});
		},
		enable_forward_rewind_buttons: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("forwardRewindButtonsChange", {
				forwardRewindButtonsEnabled: newValue
			});
		},
		enable_hide_artificial_intelligence_summary: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hideArtificialIntelligenceSummaryChange", {
				hideArtificialIntelligenceSummaryEnabled: newValue
			});
		},
		enable_hide_end_screen_cards: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hideEndScreenCardsChange", {
				hideEndScreenCardsButtonPlacement: options.button_placements["hideEndScreenCardsButton"],
				hideEndScreenCardsEnabled: newValue
			});
		},
		enable_hide_end_screen_cards_button: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hideEndScreenCardsButtonChange", {
				hideEndScreenCardsButtonEnabled: newValue
			});
		},
		enable_hide_live_stream_chat: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hideLiveStreamChatChange", {
				hideLiveStreamChatEnabled: newValue
			});
		},
		enable_hide_official_artist_videos_from_home_page: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hideOfficialArtistVideosFromHomePageChange", { hideOfficialArtistVideosFromHomePageEnabled: newValue });
		},
		enable_hide_paid_promotion_banner: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hidePaidPromotionBannerChange", {
				hidePaidPromotionBannerEnabled: newValue
			});
		},
		enable_hide_playables: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hidePlayablesChange", {
				hidePlayablesEnabled: newValue
			});
		},
		enable_hide_playlist_recommendations_from_home_page: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hidePlaylistRecommendationsFromHomePageChange", {
				hidePlaylistRecommendationsFromHomePageEnabled: newValue
			});
		},
		enable_hide_scrollbar: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hideScrollBarChange", {
				hideScrollBarEnabled: newValue
			});
		},
		enable_hide_shorts: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hideShortsChange", {
				hideShortsEnabled: newValue
			});
		},
		enable_hide_translate_comment: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("hideTranslateCommentChange", {
				hideTranslateCommentEnabled: newValue
			});
		},
		enable_loop_button: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("loopButtonChange", {
				loopButtonEnabled: newValue
			});
		},
		enable_maximize_player_button: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("maximizeButtonChange", {
				maximizePlayerButtonEnabled: newValue
			});
		},
		enable_open_transcript_button: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("openTranscriptButtonChange", {
				openTranscriptButtonEnabled: newValue
			});
		},
		enable_open_youtube_settings_on_hover: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("openYTSettingsOnHoverChange", {
				openYouTubeSettingsOnHoverEnabled: newValue
			});
		},
		enable_pausing_background_players: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("pauseBackgroundPlayersChange", {
				pauseBackgroundPlayersEnabled: newValue
			});
		},
		enable_playback_speed_buttons: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("playbackSpeedButtonsChange", {
				playbackButtonsSpeed: options.playback_buttons_speed,
				playbackSpeedButtonsEnabled: newValue
			});
		},
		enable_playlist_length: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("playlistLengthChange", {
				playlistLengthEnabled: newValue
			});
		},
		enable_playlist_management_buttons: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("playlistManagementButtonsChange", {
				playlistManagementButtonsEnabled: newValue
			});
		},
		enable_redirect_remover: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("removeRedirectChange", {
				removeRedirectEnabled: newValue
			});
		},
		enable_remaining_time: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("remainingTimeChange", {
				remainingTimeEnabled: newValue
			});
		},
		enable_remember_last_volume: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("rememberVolumeChange", {
				rememberVolumeEnabled: newValue
			});
		},
		enable_restore_fullscreen_scrolling: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("restoreFullscreenScrollingChange", {
				restoreFullscreenScrollingEnabled: newValue
			});
		},
		enable_screenshot_button: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("screenshotButtonChange", {
				screenshotButtonEnabled: newValue
			});
		},
		enable_scroll_wheel_speed_control: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("scrollWheelSpeedControlChange", {
				scrollWheelSpeedControlEnabled: newValue
			});
		},
		enable_scroll_wheel_volume_control: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("scrollWheelVolumeControlChange", {
				scrollWheelVolumeControlEnabled: newValue
			});
		},
		enable_share_shortener: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("shareShortenerChange", {
				shareShortenerEnabled: newValue
			});
		},
		enable_shorts_auto_scroll: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("shortsAutoScrollChange", {
				shortsAutoScrollEnabled: newValue
			});
		},
		enable_skip_continue_watching: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("skipContinueWatchingChange", {
				skipContinueWatchingEnabled: newValue
			});
		},
		enable_video_history: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("videoHistoryChange", {
				videoHistoryEnabled: newValue
			});
		},
		enable_volume_boost: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("volumeBoostChange", {
				volumeBoostEnabled: newValue,
				volumeBoostMode: options.volume_boost_mode
			});
		},
		feature_menu_open_type: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("featureMenuOpenTypeChange", {
				featureMenuOpenType: newValue
			});
		},
		forward_rewind_buttons_time: () => {
			sendExtensionOnlyMessage("forwardRewindButtonsChange", {
				forwardRewindButtonsEnabled: options.enable_forward_rewind_buttons
			});
		},
		language: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("languageChange", {
				language: newValue
			});
		},
		playback_buttons_speed: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("playbackSpeedButtonsChange", {
				playbackButtonsSpeed: newValue,
				playbackSpeedButtonsEnabled: options.enable_playback_speed_buttons
			});
		},
		player_speed: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("playerSpeedChange", {
				enableForcedPlaybackSpeed: options.enable_forced_playback_speed,
				playerSpeed: newValue
			});
		},
		playlist_length_get_method: () => {
			sendExtensionOnlyMessage("playlistLengthGetMethodChange", undefined);
		},
		playlist_watch_time_get_method: () => {
			sendExtensionOnlyMessage("playlistWatchTimeGetMethodChange", undefined);
		},
		volume_boost_amount: (newValue) => {
			sendExtensionOnlyMessage("volumeBoostAmountChange", {
				volumeBoostAmount: newValue,
				volumeBoostEnabled: options.enable_volume_boost,
				volumeBoostMode: options.volume_boost_mode
			});
		},

		volume_boost_mode: (__oldValue, newValue) => {
			sendExtensionOnlyMessage("volumeBoostChange", {
				volumeBoostEnabled: options.enable_volume_boost,
				volumeBoostMode: newValue
			});
		}
	};
	Object.entries(castedChanges).forEach(([key, change]) => {
		if (isValidChange(change)) {
			if (!change.newValue) return;
			if (!change.oldValue) return;
			const oldValue = parseStoredValue(change.oldValue) as configuration[typeof key];
			const newValue = parseStoredValue(change.newValue) as configuration[typeof key];
			const { [key]: handler } = keyActions;
			if (!handler) return;
			(handler as (oldValue: configuration[typeof key], newValue: configuration[typeof key]) => void)(oldValue, newValue);
		}
	});
};
