import { ExtensionSendOnlyMessageMappings, Messages, YouTubePlayerDiv } from "@/src/types";
import { browserColorLog, formatError } from "@/utils/utilities";
import eventManager from "@/utils/EventManager";
import { addMaximizePlayerButton, removeMaximizePlayerButton } from "@/src/features/maximizePlayerButton";
import { maximizePlayer } from "@/src/features/maximizePlayerButton/utils";
import setPlayerQuality from "@/src/features/playerQuality";
import setPlayerSpeed from "@/src/features/playerSpeed";
import setRememberedVolume from "@/src/features/rememberVolume";
import { addScreenshotButton, removeScreenshotButton } from "@/src/features/screenshotButton";
import adjustVolumeOnScrollWheel from "@/src/features/scrollWheelVolumeControl";
import setupVideoHistory from "@/src/features/videoHistory";
import volumeBoost from "@/src/features/volumeBoost";
// TODO: Add remaining time feature
// TODO: Add always show progressbar feature

const alwaysShowProgressBar = async function () {
	const player = document.querySelector("#movie_player") as YouTubePlayerDiv | null;
	if (!player) return;
	const playBar = player.querySelector(".ytp-play-progress") as HTMLDivElement | null;
	if (!playBar) return;
	const loadBar = player.querySelector(".ytp-load-progress") as HTMLDivElement | null;
	if (!loadBar) return;
	const currentTime = await player.getCurrentTime();
	const duration = await player.getDuration();
	const bytesLoaded = await player.getVideoBytesLoaded();
	const played = (currentTime * 100) / duration;
	const loaded = bytesLoaded * 100;
	let width = 0;
	let progressPlay = 0;
	let progressLoad = 0;

	width += playBar.offsetWidth;

	const widthPercent = width / 100;
	const progressWidth = playBar.offsetWidth / widthPercent;
	let playBarProgress = 0;
	let loadBarProgress = 0;
	if (played - progressPlay >= progressWidth) {
		playBarProgress = 100;
	} else if (played > progressPlay && played < progressWidth + progressPlay) {
		loadBarProgress = (100 * ((played - progressPlay) * widthPercent)) / playBar.offsetWidth;
	}
	playBar.style.transform = `scaleX(${playBarProgress / 100})`;
	if (loaded - progressLoad >= progressWidth) {
		loadBarProgress = 100;
	} else if (loaded > progressLoad && loaded < progressWidth + progressLoad) {
		loadBarProgress = (100 * ((loaded - progressLoad) * widthPercent)) / playBar.offsetWidth;
	}
	loadBar.style.transform = `scaleX(${loadBarProgress / 100})`;
	progressPlay += progressWidth;
	progressLoad += progressWidth;
};

/**
 * Creates a hidden div element with a specific ID that can be used to receive messages from YouTube.
 * The element is appended to the document's root element.
 */
const element = document.createElement("div");
element.style.display = "none";
element.id = "yte-message-from-youtube";
document.documentElement.appendChild(element);

window.onload = function () {
	setRememberedVolume();
	const enableFeatures = () => {
		eventManager.removeAllEventListeners();
		addScreenshotButton();
		addMaximizePlayerButton();
		setRememberedVolume();
		setPlayerQuality();
		setPlayerSpeed();
		volumeBoost();
		adjustVolumeOnScrollWheel();
		setupVideoHistory();
	};
	document.addEventListener("yt-player-updated", enableFeatures);
	/**
	 * Listens for the "yte-message-from-youtube" event and handles incoming messages from the YouTube page.
	 *
	 * @returns {void}
	 */
	document.addEventListener("yte-message-from-extension", async () => {
		const provider = document.querySelector("#yte-message-from-extension");
		if (!provider) return;
		const { textContent: stringifiedMessage } = provider;
		if (!stringifiedMessage) return;
		let message;
		try {
			message = JSON.parse(stringifiedMessage) as Messages["response"] | ExtensionSendOnlyMessageMappings[keyof ExtensionSendOnlyMessageMappings];
		} catch (error) {
			console.error(error);
			return;
		}
		if (!message) return;
		switch (message.type) {
			case "volumeBoostChange": {
				const {
					data: { volumeBoostAmount, volumeBoostEnabled }
				} = message;
				if (volumeBoostEnabled) {
					if (window.audioCtx && window.gainNode) {
						browserColorLog(`Setting volume boost to ${Math.pow(10, Number(volumeBoostAmount) / 20)}`, "FgMagenta");
						window.gainNode.gain.value = Math.pow(10, Number(volumeBoostAmount) / 20);
					} else {
						volumeBoost();
					}
				} else {
					if (window.audioCtx && window.gainNode) {
						browserColorLog(`Setting volume boost to 1x`, "FgMagenta");
						window.gainNode.gain.value = 1;
					}
				}
				break;
			}
			case "playerSpeedChange": {
				const {
					data: { playerSpeed, enableForcedPlaybackSpeed }
				} = message;
				if (enableForcedPlaybackSpeed && playerSpeed) {
					setPlayerSpeed({
						enableForcedPlaybackSpeed,
						playerSpeed: Number(playerSpeed)
					});
				} else {
					setPlayerSpeed({
						enableForcedPlaybackSpeed: false,
						playerSpeed: 1
					});
				}
				break;
			}
			case "screenshotButtonChange": {
				const {
					data: { screenshotButtonEnabled }
				} = message;
				if (screenshotButtonEnabled) {
					addScreenshotButton();
				} else {
					removeScreenshotButton();
				}
				break;
			}
			case "maximizePlayerButtonChange": {
				const {
					data: { maximizePlayerButtonEnabled }
				} = message;
				if (maximizePlayerButtonEnabled) {
					addMaximizePlayerButton();
				} else {
					removeMaximizePlayerButton();
					const maximizePlayerButton = document.querySelector("button.yte-maximize-player-button") as HTMLButtonElement | null;
					if (!maximizePlayerButton) return;
					// Get the video element
					const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
					// If video element is not available, return
					if (!videoElement) return;
					const videoContainer = document.querySelector("#movie_player") as YouTubePlayerDiv | null;
					if (!videoContainer) return;
					if (videoContainer.classList.contains("maximized_video_container") && videoElement.classList.contains("maximized_video")) {
						maximizePlayer(maximizePlayerButton);
					}
				}
				break;
			}
			case "videoHistoryChange": {
				const {
					data: { videoHistoryEnabled }
				} = message;
				if (videoHistoryEnabled) {
					setupVideoHistory();
				} else {
					eventManager.removeEventListeners("videoHistory");
				}
				break;
			}
			default: {
				return;
			}
		}
	});
};
window.onbeforeunload = function () {
	eventManager.removeAllEventListeners();
	element.remove();
};

// Error handling
window.addEventListener("error", (event) => {
	event.preventDefault();
	browserColorLog(formatError(event.error), "FgRed");
});
window.addEventListener("unhandledrejection", (event) => {
	event.preventDefault();
	browserColorLog(`Unhandled rejection: ${event.reason}`, "FgRed");
});
