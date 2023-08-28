import { configuration, configurationWithDefaults, MessageData, MessageTypes } from "@/src/types";
import { parseReviver } from "@/src/utils/utilities";

/**
 * Adds a script element to the document's root element, which loads a JavaScript file from the extension's runtime URL.
 * Also creates a hidden div element with a specific ID to receive messages from the extension.
 */
const script = document.createElement("script");
script.src = chrome.runtime.getURL("src/pages/content/index.js");
script.type = "text/javascript";

const element = document.createElement("div");
element.style.display = "none";
element.id = "yte-message-from-extension";
document.documentElement.appendChild(element);
document.documentElement.appendChild(script);
(async () => {
	/**
	 * Retrieves the options from the local storage and sends them back to the youtube page.
	 *
	 * @type {configuration}
	 */
	const options: configuration = await new Promise((resolve) => {
		chrome.storage?.local?.get((o) => {
			resolve(JSON.parse(JSON.stringify(o), parseReviver) as configurationWithDefaults);
		});
	});
	sendMessage("options", { options, source: "extension" });
})();
/**
 * Sends a message to the youtube page.
 *
 * @template T - The type of the event.
 * @param {T} eventType - The type of the event.
 * @param {Omit<MessageData<T>, "type">} data - The data associated with the event.
 * @returns {void}
 */
function sendMessage<T extends MessageTypes>(eventType: T, data: Omit<MessageData<T>, "type">) {
	const message: Omit<MessageData<typeof eventType>, "type"> = {
		type: eventType,
		source: "extension",
		...data
	};
	const stringifiedMessage = JSON.stringify(message);
	element.textContent = stringifiedMessage;
	document.dispatchEvent(new CustomEvent("yte-message-from-extension"));
}

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
		message = JSON.parse(stringifiedMessage) as MessageData<MessageTypes>;
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
					resolve(JSON.parse(JSON.stringify(o), parseReviver) as configurationWithDefaults);
				});
			});
			sendMessage("options", { options, source: "extension" });
			break;
		}

		case "setVolume": {
			/**
			 * Sets the remembered volume in the local storage.
			 *
			 * @type {number}
			 */
			chrome.storage?.local?.set({ remembered_volume: message.volume });
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
			resolve(JSON.parse(JSON.stringify(o), parseReviver) as configurationWithDefaults);
		});
	});
	const keyActions: {
		[K in keyof configuration]?: () => void;
	} = {
		enable_volume_boost: () => {
			if (Object.prototype.hasOwnProperty.call(castedChanges, "enable_volume_boost") && castedChanges.enable_volume_boost.newValue !== undefined) {
				sendMessage("volumeBoostChange", {
					source: "extension",
					volumeBoostEnabled: castedChanges.enable_volume_boost.newValue,
					volumeBoostAmount: options.volume_boost_amount
				});
			}
		},
		volume_boost_amount: () => {
			if (Object.prototype.hasOwnProperty.call(castedChanges, "volume_boost_amount") && castedChanges.volume_boost_amount.newValue !== undefined) {
				sendMessage("volumeBoostChange", {
					source: "extension",
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
				sendMessage("playerSpeedChange", {
					source: "extension",
					enableForcedPlaybackSpeed: castedChanges.enable_forced_playback_speed.newValue,
					playerSpeed: options.player_speed
				});
			}
		},
		player_speed: () => {
			if (Object.prototype.hasOwnProperty.call(castedChanges, "player_speed") && castedChanges.player_speed?.newValue !== undefined) {
				sendMessage("playerSpeedChange", {
					source: "extension",
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
				sendMessage("screenshotButtonChange", {
					source: "extension",
					screenshotButtonEnabled: castedChanges.enable_screenshot_button.newValue
				});
			}
		},
		enable_maximize_player_button: () => {
			if (
				Object.prototype.hasOwnProperty.call(castedChanges, "enable_maximize_player_button") &&
				castedChanges.enable_maximize_player_button.newValue !== undefined
			) {
				sendMessage("maximizePlayerButtonChange", {
					source: "extension",
					maximizePlayerButtonEnabled: castedChanges.enable_maximize_player_button.newValue
				});
			}
		},
		enable_video_history: () => {
			if (Object.prototype.hasOwnProperty.call(castedChanges, "enable_video_history") && castedChanges.enable_video_history.newValue !== undefined) {
				sendMessage("videoHistoryChange", {
					source: "extension",
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
