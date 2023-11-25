import type { AvailableLocales } from "@/src/i18n";
import type { ContentSendOnlyMessageMappings, Messages, StorageChanges, configuration, configurationKeys } from "@/src/types";

import { getVideoHistory, setVideoHistory } from "@/src/features/videoHistory/utils";
import { defaultConfiguration } from "@/src/utils/constants";
import { parseStoredValue, sendExtensionMessage, sendExtensionOnlyMessage } from "@/src/utils/utilities";

/**
 * Adds a script element to the document's root element, which loads a JavaScript file from the extension's runtime URL.
 * Also creates a hidden div element with a specific ID to receive messages from the extension.
 */
const script = document.createElement("script");
script.src = chrome.runtime.getURL("src/pages/content/index.js");
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
		chrome.storage.local.get((settings) => {
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
			message = JSON.parse(stringifiedMessage) as ContentSendOnlyMessageMappings[keyof ContentSendOnlyMessageMappings] | Messages["request"];
		} catch (error) {
			console.error(error);
			return;
		}
		if (!message) return;
		switch (message.type) {
			case "options": {
				/**
				 * Retrieves the options from the local storage and sends them back to the youtube page.
				 *
				 * @type {configuration}
				 */
				const options: configuration = await new Promise((resolve) => {
					chrome.storage.local.get((settings) => {
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
			case "videoHistoryOne": {
				const { action, data } = message;
				if (!data) return;
				switch (action) {
					case "request_data": {
						const { id } = data;
						const videoHistory = getVideoHistory();
						void sendExtensionMessage("videoHistoryOne", "data_response", {
							video_history_entry: videoHistory[id]
						});
						break;
					}
					case "send_data": {
						const { video_history_entry } = data;
						if (!video_history_entry) return;
						const { id, status, timestamp } = video_history_entry;
						setVideoHistory(id, timestamp, status);
						break;
					}
				}
				break;
			}
			case "videoHistoryAll": {
				const videoHistory = getVideoHistory();
				void sendExtensionMessage("videoHistoryAll", "data_response", {
					video_history_entries: videoHistory
				});
				break;
			}
			case "setRememberedVolume": {
				/**
				 * Sets the remembered volume in the local storage.
				 *
				 * @type {number}
				 */
				void chrome.storage.local.set({ remembered_volumes: JSON.stringify({ ...message.data }) });
				break;
			}
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
			case "pageLoaded": {
				chrome.storage.onChanged.addListener(storageListeners);
				window.onunload = () => {
					chrome.storage.onChanged.removeListener(storageListeners);
				};
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
const storageChangeHandler = async (changes: StorageChanges, areaName: string) => {
	if (areaName !== "local") return;
	const castedChanges = changes as {
		[K in keyof configuration]: {
			newValue: configuration[K];
			oldValue: configuration[K] | undefined;
		};
	};
	const options: configuration = await new Promise((resolve) => {
		chrome.storage.local.get((settings) => {
			const storedSettings: Partial<configuration> = (
				Object.keys(settings)
					.filter((key) => typeof key === "string")
					.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string)) as configurationKeys[]
			).reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
			resolve(storedSettings as configuration);
		});
	});
	const keyActions: {
		[K in keyof configuration]?: () => void;
	} = {
		enable_automatic_theater_mode: () => {
			sendExtensionOnlyMessage("automaticTheaterModeChange", {
				automaticTheaterModeEnabled: castedChanges.enable_automatic_theater_mode.newValue
			});
		},
		enable_forced_playback_speed: () => {
			sendExtensionOnlyMessage("playerSpeedChange", {
				enableForcedPlaybackSpeed: castedChanges.enable_forced_playback_speed.newValue,
				playerSpeed: options.player_speed
			});
		},
		enable_hide_scrollbar: () => {
			sendExtensionOnlyMessage("hideScrollBarChange", {
				hideScrollBarEnabled: castedChanges.enable_hide_scrollbar.newValue
			});
		},
		enable_loop_button: () => {
			sendExtensionOnlyMessage("loopButtonChange", {
				loopButtonEnabled: castedChanges.enable_loop_button.newValue
			});
		},
		enable_maximize_player_button: () => {
			sendExtensionOnlyMessage("maximizePlayerButtonChange", {
				maximizePlayerButtonEnabled: castedChanges.enable_maximize_player_button.newValue
			});
		},
		enable_remaining_time: () => {
			sendExtensionOnlyMessage("remainingTimeChange", {
				remainingTimeEnabled: castedChanges.enable_remaining_time.newValue
			});
		},
		enable_remember_last_volume: () => {
			sendExtensionOnlyMessage("rememberVolumeChange", {
				rememberVolumeEnabled: castedChanges.enable_remember_last_volume.newValue
			});
		},
		enable_screenshot_button: () => {
			sendExtensionOnlyMessage("screenshotButtonChange", {
				screenshotButtonEnabled: castedChanges.enable_screenshot_button.newValue
			});
		},
		enable_scroll_wheel_volume_control: () => {
			sendExtensionOnlyMessage("scrollWheelVolumeControlChange", {
				scrollWheelVolumeControlEnabled: castedChanges.enable_scroll_wheel_volume_control.newValue
			});
		},
		enable_video_history: () => {
			sendExtensionOnlyMessage("videoHistoryChange", {
				videoHistoryEnabled: castedChanges.enable_video_history.newValue
			});
		},
		enable_volume_boost: () => {
			sendExtensionOnlyMessage("volumeBoostChange", {
				volumeBoostAmount: options.volume_boost_amount,
				volumeBoostEnabled: castedChanges.enable_volume_boost.newValue
			});
		},
		language: () => {
			sendExtensionOnlyMessage("languageChange", {
				language: castedChanges.language.newValue
			});
		},
		player_speed: () => {
			sendExtensionOnlyMessage("playerSpeedChange", {
				enableForcedPlaybackSpeed: options.enable_forced_playback_speed,
				playerSpeed: castedChanges.player_speed.newValue
			});
		},
		volume_boost_amount: () => {
			sendExtensionOnlyMessage("volumeBoostChange", {
				volumeBoostAmount: castedChanges.volume_boost_amount.newValue,
				volumeBoostEnabled: options.enable_volume_boost
			});
		}
	};
	Object.entries(
		changes as { [K in keyof configuration]?: { newValue?: configuration[K] | undefined; oldValue?: configuration[K] | undefined } }
	).forEach(([key, change]) => {
		if (
			change &&
			Object.prototype.hasOwnProperty.call(keyActions, key) &&
			change.newValue !== undefined &&
			change.oldValue !== undefined &&
			parseStoredValue(change.oldValue as string) !== parseStoredValue(change.newValue as string)
		) {
			keyActions[key]?.();
		}
	});
};
