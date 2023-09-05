import { getVideoHistory, setVideoHistory } from "@/src/features/videoHistory/utils";
import { ContentSendOnlyMessageMappings, Messages, configuration } from "@/src/types";
import { parseReviver, sendExtensionOnlyMessage, sendExtensionMessage } from "@/src/utils/utilities";

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
(async () => {
	/**
	 * Retrieves the options from the local storage and sends them back to the youtube page.
	 *
	 * @type {configuration}
	 */
	const options: configuration = await new Promise((resolve) => {
		chrome.storage?.local?.get((o) => {
			resolve(JSON.parse(JSON.stringify(o), parseReviver) as configuration);
		});
	});
	sendExtensionMessage("options", "data_response", { options });
})();

/**
 * Listens for the "yte-message-from-youtube" event and handles incoming messages from the YouTube page.
 *
 * @returns {void}
 */
document.addEventListener("yte-message-from-youtube", async () => {
	const provider = document.querySelector("#yte-message-from-youtube");
	if (!provider) return;
	const { textContent: stringifiedMessage } = provider;
	if (!stringifiedMessage) return;
	let message;
	try {
		message = JSON.parse(stringifiedMessage) as Messages["request"] | ContentSendOnlyMessageMappings[keyof ContentSendOnlyMessageMappings];
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
				chrome.storage?.local?.get((o) => {
					resolve(JSON.parse(JSON.stringify(o), parseReviver) as configuration);
				});
			});
			sendExtensionMessage("options", "data_response", { options });
			break;
		}
		case "videoHistoryOne": {
			const { data, action } = message;
			if (!data) return;
			switch (action) {
				case "request_data": {
					const { id } = data;
					const videoHistory = getVideoHistory();
					sendExtensionMessage("videoHistoryOne", "data_response", {
						video_history_entry: videoHistory[id]
					});
					break;
				}
				case "send_data": {
					const { video_history_entry } = data;
					if (!video_history_entry) return;
					const { id, timestamp, status } = video_history_entry;
					setVideoHistory(id, timestamp, status);
					break;
				}
			}
			break;
		}
		case "videoHistoryAll": {
			const videoHistory = getVideoHistory();
			sendExtensionMessage("videoHistoryAll", "data_response", {
				video_history_entries: videoHistory
			});
			break;
		}
		case "setVolume": {
			/**
			 * Sets the remembered volume in the local storage.
			 *
			 * @type {number}
			 */
			chrome.storage?.local?.set({ remembered_volume: message.data.volume });
			break;
		}
	}
});
const storageListeners = async (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
	if (areaName !== "local") return;
	const changeKeys = Object.keys(
		changes as {
			[K in keyof configuration]?: {
				oldValue: configuration[K] | undefined;
				newValue: configuration[K] | undefined;
			};
		}
	);
	if (!changeKeys.length) return;
	storageChangeHandler(changes, areaName);
};
const storageChangeHandler = async (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
	if (areaName !== "local") return;
	const castedChanges = changes as {
		[K in keyof configuration]: {
			oldValue: configuration[K] | undefined;
			newValue: configuration[K] | undefined;
		};
	};
	const options: configuration = await new Promise((resolve) => {
		chrome.storage?.local?.get((o) => {
			resolve(JSON.parse(JSON.stringify(o), parseReviver) as configuration);
		});
	});
	const keyActions: {
		[K in keyof configuration]?: () => void;
	} = {
		enable_volume_boost: () => {
			if (Object.prototype.hasOwnProperty.call(castedChanges, "enable_volume_boost") && castedChanges.enable_volume_boost.newValue !== undefined) {
				sendExtensionOnlyMessage("volumeBoostChange", {
					volumeBoostEnabled: castedChanges.enable_volume_boost.newValue,
					volumeBoostAmount: options.volume_boost_amount
				});
			}
		},
		volume_boost_amount: () => {
			if (Object.prototype.hasOwnProperty.call(castedChanges, "volume_boost_amount") && castedChanges.volume_boost_amount.newValue !== undefined) {
				sendExtensionOnlyMessage("volumeBoostChange", {
					volumeBoostAmount: castedChanges.volume_boost_amount.newValue,
					volumeBoostEnabled: options.enable_volume_boost
				});
			}
		},
		enable_forced_playback_speed: () => {
			if (
				Object.prototype.hasOwnProperty.call(castedChanges, "enable_forced_playback_speed") &&
				castedChanges.enable_forced_playback_speed.newValue !== undefined
			) {
				sendExtensionOnlyMessage("playerSpeedChange", {
					enableForcedPlaybackSpeed: castedChanges.enable_forced_playback_speed.newValue,
					playerSpeed: options.player_speed
				});
			}
		},
		player_speed: () => {
			if (Object.prototype.hasOwnProperty.call(castedChanges, "player_speed") && castedChanges.player_speed?.newValue !== undefined) {
				sendExtensionOnlyMessage("playerSpeedChange", {
					playerSpeed: castedChanges.player_speed.newValue,
					enableForcedPlaybackSpeed: options.enable_forced_playback_speed
				});
			}
		},
		enable_screenshot_button: () => {
			if (
				Object.prototype.hasOwnProperty.call(castedChanges, "enable_screenshot_button") &&
				castedChanges.enable_screenshot_button.newValue !== undefined
			) {
				sendExtensionOnlyMessage("screenshotButtonChange", {
					screenshotButtonEnabled: castedChanges.enable_screenshot_button.newValue
				});
			}
		},
		enable_maximize_player_button: () => {
			if (
				Object.prototype.hasOwnProperty.call(castedChanges, "enable_maximize_player_button") &&
				castedChanges.enable_maximize_player_button.newValue !== undefined
			) {
				sendExtensionOnlyMessage("maximizePlayerButtonChange", {
					maximizePlayerButtonEnabled: castedChanges.enable_maximize_player_button.newValue
				});
			}
		},
		enable_video_history: () => {
			if (Object.prototype.hasOwnProperty.call(castedChanges, "enable_video_history") && castedChanges.enable_video_history.newValue !== undefined) {
				sendExtensionOnlyMessage("videoHistoryChange", {
					videoHistoryEnabled: castedChanges.enable_video_history.newValue
				});
			}
		}
	};
	Object.entries(
		changes as { [K in keyof configuration]?: { oldValue?: configuration[K] | undefined; newValue?: configuration[K] | undefined } }
	).forEach(([key, change]) => {
		if (Object.prototype.hasOwnProperty.call(keyActions, key)) {
			if (!change) return;
			keyActions[key]?.();
		}
	});
};

window.onload = () => {
	chrome.storage.onChanged.addListener(storageListeners);
};
window.onunload = () => {
	chrome.storage.onChanged.removeListener(storageListeners);
};
