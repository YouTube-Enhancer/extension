import type { ExtensionSendOnlyMessageMappings, Messages, YouTubePlayerDiv } from "@/src/types";

import { automaticTheaterMode } from "@/src/features/automaticTheaterMode";
import { enableFeatureMenu } from "@/src/features/featureMenu";
import { updateFeatureMenuItemLabel, updateFeatureMenuTitle } from "@/src/features/featureMenu/utils";
import { enableHideScrollBar } from "@/src/features/hideScrollBar";
import { hideScrollBar, showScrollBar } from "@/src/features/hideScrollBar/utils";
import { addLoopButton, removeLoopButton } from "@/src/features/loopButton";
import { addMaximizePlayerButton, removeMaximizePlayerButton } from "@/src/features/maximizePlayerButton";
import { maximizePlayer } from "@/src/features/maximizePlayerButton/utils";
import setPlayerQuality from "@/src/features/playerQuality";
import { restorePlayerSpeed, setPlayerSpeed, setupPlaybackSpeedChangeListener } from "@/src/features/playerSpeed";
import { removeRemainingTimeDisplay, setupRemainingTime } from "@/src/features/remainingTime";
import enableRememberVolume from "@/src/features/rememberVolume";
import { addScreenshotButton, removeScreenshotButton } from "@/src/features/screenshotButton";
import adjustVolumeOnScrollWheel from "@/src/features/scrollWheelVolumeControl";
import { promptUserToResumeVideo, setupVideoHistory } from "@/src/features/videoHistory";
import volumeBoost, { disableVolumeBoost, enableVolumeBoost, removeVolumeBoostButton } from "@/src/features/volumeBoost";
import { i18nService } from "@/src/i18n";
import eventManager from "@/utils/EventManager";
import {
	browserColorLog,
	formatError,
	isShortsPage,
	isWatchPage,
	sendContentOnlyMessage,
	waitForAllElements,
	waitForSpecificMessage
} from "@/utils/utilities";
// TODO: Add always show progressbar feature

/**
 * Creates a hidden div element with a specific ID that can be used to receive messages from YouTube.
 * The element is appended to the document's root element.
 */
const element = document.createElement("div");
element.style.display = "none";
element.id = "yte-message-from-youtube";
document.documentElement.appendChild(element);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const alwaysShowProgressBar = async function () {
	const player = document.querySelector<YouTubePlayerDiv>("#movie_player");
	if (!player) return;
	const playBar = player.querySelector<HTMLDivElement>(".ytp-play-progress");
	if (!playBar) return;
	const loadBar = player.querySelector<HTMLDivElement>(".ytp-load-progress");
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

window.addEventListener("DOMContentLoaded", function () {
	void (async () => {
		void enableRememberVolume();
		void enableHideScrollBar();

		const enableFeatures = () => {
			void (async () => {
				// Wait for the specified container selectors to be available on the page
				await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
				eventManager.removeAllEventListeners(["featureMenu"]);
				enableFeatureMenu();
				void addLoopButton();
				void addMaximizePlayerButton();
				void volumeBoost();
				void addScreenshotButton();
				void enableRememberVolume();
				setupPlaybackSpeedChangeListener();
				void setPlayerQuality();
				void setPlayerSpeed();
				void volumeBoost();
				void adjustVolumeOnScrollWheel();
				void promptUserToResumeVideo(() => {
					void setupVideoHistory();
				});
				void setupRemainingTime();
				void automaticTheaterMode();
			})();
		};
		const response = await waitForSpecificMessage("language", "request_data", "content");
		if (!response) return;
		const {
			data: { language }
		} = response;
		const i18nextInstance = await i18nService(language);
		window.i18nextInstance = i18nextInstance;
		if (isWatchPage() || isShortsPage()) document.addEventListener("yt-navigate-finish", enableFeatures);
		document.addEventListener("yt-player-updated", enableFeatures);
		/**
		 * Listens for the "yte-message-from-youtube" event and handles incoming messages from the YouTube page.
		 *
		 * @returns {void}
		 */
		document.addEventListener("yte-message-from-extension", () => {
			void (async () => {
				const provider = document.querySelector("#yte-message-from-extension");
				if (!provider) return;
				const { textContent: stringifiedMessage } = provider;
				if (!stringifiedMessage) return;
				let message;
				try {
					message = JSON.parse(stringifiedMessage) as ExtensionSendOnlyMessageMappings[keyof ExtensionSendOnlyMessageMappings] | Messages["response"];
				} catch (error) {
					console.error(error);
					return;
				}
				if (!message) return;
				switch (message.type) {
					case "volumeBoostChange": {
						const {
							data: { volumeBoostEnabled }
						} = message;
						if (volumeBoostEnabled) {
							await enableVolumeBoost();
						} else {
							disableVolumeBoost();
							removeVolumeBoostButton();
						}
						break;
					}
					case "playerSpeedChange": {
						const {
							data: { enableForcedPlaybackSpeed, playerSpeed }
						} = message;
						if (enableForcedPlaybackSpeed && playerSpeed) {
							void setPlayerSpeed(Number(playerSpeed));
						} else if (!enableForcedPlaybackSpeed) {
							restorePlayerSpeed();
						}
						break;
					}
					case "screenshotButtonChange": {
						const {
							data: { screenshotButtonEnabled }
						} = message;
						if (screenshotButtonEnabled) {
							void addScreenshotButton();
						} else {
							removeScreenshotButton();
						}
						break;
					}
					case "maximizeButtonChange": {
						const {
							data: { maximizePlayerButtonEnabled }
						} = message;
						if (maximizePlayerButtonEnabled) {
							void addMaximizePlayerButton();
						} else {
							void removeMaximizePlayerButton();
							const maximizePlayerButton = document.querySelector<HTMLButtonElement>("video.html5-main-video");
							if (!maximizePlayerButton) return;
							// Get the video element
							const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							// If video element is not available, return
							if (!videoElement) return;
							const videoContainer = document.querySelector<YouTubePlayerDiv>("video.html5-main-video");
							if (!videoContainer) return;
							if (videoContainer.classList.contains("maximized_video_container") && videoElement.classList.contains("maximized_video")) {
								maximizePlayer();
							}
						}
						break;
					}
					case "videoHistoryChange": {
						const {
							data: { videoHistoryEnabled }
						} = message;
						if (videoHistoryEnabled) {
							void setupVideoHistory();
						} else {
							eventManager.removeEventListeners("videoHistory");
						}
						break;
					}
					case "remainingTimeChange": {
						const {
							data: { remainingTimeEnabled }
						} = message;
						if (remainingTimeEnabled) {
							void setupRemainingTime();
						} else {
							removeRemainingTimeDisplay();
						}
						break;
					}
					case "loopButtonChange": {
						const {
							data: { loopButtonEnabled }
						} = message;
						if (loopButtonEnabled) {
							void addLoopButton();
						} else {
							removeLoopButton();
						}
						break;
					}
					case "scrollWheelVolumeControlChange": {
						const {
							data: { scrollWheelVolumeControlEnabled }
						} = message;
						if (scrollWheelVolumeControlEnabled) {
							void adjustVolumeOnScrollWheel();
						} else {
							eventManager.removeEventListeners("scrollWheelVolumeControl");
						}
						break;
					}
					case "rememberVolumeChange": {
						const {
							data: { rememberVolumeEnabled }
						} = message;
						if (rememberVolumeEnabled) {
							void enableRememberVolume();
						} else {
							eventManager.removeEventListeners("rememberVolume");
						}
						break;
					}
					case "hideScrollBarChange": {
						const scrollBarHidden = document.getElementById("yte-hide-scroll-bar") !== null;
						const {
							data: { hideScrollBarEnabled }
						} = message;
						if (hideScrollBarEnabled) {
							if (!scrollBarHidden) {
								hideScrollBar();
							}
						} else {
							if (scrollBarHidden) {
								showScrollBar();
							}
						}
						break;
					}
					case "languageChange": {
						const {
							data: { language }
						} = message;
						window.i18nextInstance = await i18nService(language);
						void updateFeatureMenuTitle(window.i18nextInstance.t("pages.content.features.featureMenu.label"));
						void updateFeatureMenuItemLabel("screenshotButton", window.i18nextInstance.t("pages.content.features.screenshotButton.label"));
						void updateFeatureMenuItemLabel("maximizePlayerButton", window.i18nextInstance.t("pages.content.features.maximizePlayerButton.label"));
						void updateFeatureMenuItemLabel("loopButton", window.i18nextInstance.t("pages.content.features.loopButton.label"));
						break;
					}
					case "automaticTheaterModeChange": {
						// Get the player element
						const playerContainer = isWatchPage()
							? document.querySelector("div#movie_player")
							: isShortsPage()
							  ? document.querySelector("div#shorts-player")
							  : null;
						// If player element is not available, return
						if (!playerContainer) return;
						// Get the size button
						const sizeButton = document.querySelector<HTMLButtonElement>("video.html5-main-video");
						// If the size button is not available return
						if (!sizeButton) return;
						sizeButton.click();

						break;
					}
					default: {
						return;
					}
				}
			})();
		});
		sendContentOnlyMessage("pageLoaded", undefined);
	})();
});
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
