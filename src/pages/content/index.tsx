import type { ExtensionSendOnlyMessageMappings, Messages, YouTubePlayerDiv } from "@/src/types";

import { type FeatureFuncRecord, featureButtonFunctions } from "@/src/features";
import { automaticTheaterMode } from "@/src/features/automaticTheaterMode";
import { featuresInControls } from "@/src/features/buttonPlacement";
import { checkIfFeatureButtonExists, getFeatureButton, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { disableCustomCSS, enableCustomCSS } from "@/src/features/customCSS";
import { customCSSExists, updateCustomCSS } from "@/src/features/customCSS/utils";
import { enableFeatureMenu, setupFeatureMenuEventListeners } from "@/src/features/featureMenu";
import { featuresInMenu, updateFeatureMenuItemLabel, updateFeatureMenuTitle } from "@/src/features/featureMenu/utils";
import { enableHideScrollBar } from "@/src/features/hideScrollBar";
import { hideScrollBar, showScrollBar } from "@/src/features/hideScrollBar/utils";
import { disableHideShorts, enableHideShorts } from "@/src/features/hideShorts";
import { addLoopButton, removeLoopButton } from "@/src/features/loopButton";
import { addMaximizePlayerButton, removeMaximizePlayerButton } from "@/src/features/maximizePlayerButton";
import { maximizePlayer } from "@/src/features/maximizePlayerButton/utils";
import { openTranscriptButton } from "@/src/features/openTranscriptButton";
import { removeOpenTranscriptButton } from "@/src/features/openTranscriptButton/utils";
import { disableOpenYouTubeSettingsOnHover, enableOpenYouTubeSettingsOnHover } from "@/src/features/openYouTubeSettingsOnHover";
import setPlayerQuality from "@/src/features/playerQuality";
import { restorePlayerSpeed, setPlayerSpeed, setupPlaybackSpeedChangeListener } from "@/src/features/playerSpeed";
import { removeRemainingTimeDisplay, setupRemainingTime } from "@/src/features/remainingTime";
import enableRememberVolume from "@/src/features/rememberVolume";
import removeRedirect from "@/src/features/removeRedirect";
import { addScreenshotButton, removeScreenshotButton } from "@/src/features/screenshotButton";
import adjustSpeedOnScrollWheel from "@/src/features/scrollWheelSpeedControl";
import adjustVolumeOnScrollWheel from "@/src/features/scrollWheelVolumeControl";
import { disableShareShortener, enableShareShortener } from "@/src/features/shareShortener";
import { disableShortsAutoScroll, enableShortsAutoScroll } from "@/src/features/shortsAutoScroll";
import { promptUserToResumeVideo, setupVideoHistory } from "@/src/features/videoHistory";
import volumeBoost, {
	addVolumeBoostButton,
	applyVolumeBoost,
	disableVolumeBoost,
	enableVolumeBoost,
	removeVolumeBoostButton
} from "@/src/features/volumeBoost";
import { i18nService } from "@/src/i18n";
import { type ToggleFeatures, toggleFeatures } from "@/src/icons";
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
		const enableFeatures = () => {
			void (async () => {
				// Wait for the specified container selectors to be available on the page
				await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
				eventManager.removeAllEventListeners(["featureMenu"]);
				void enableHideShorts();
				void removeRedirect();
				void enableShareShortener();
				void enableRememberVolume();
				void enableHideScrollBar();
				void enableCustomCSS();
				if (isWatchPage() || isShortsPage()) {
					void promptUserToResumeVideo(() => {
						void setupVideoHistory();
					});
					setupPlaybackSpeedChangeListener();
					void enableShortsAutoScroll();
					void enableFeatureMenu();
					void enableOpenYouTubeSettingsOnHover();
					void enableRememberVolume();
					void automaticTheaterMode();
					void setupRemainingTime();
					void volumeBoost();
					void setPlayerQuality();
					void setPlayerSpeed();
					void openTranscriptButton();
					void addLoopButton();
					void addMaximizePlayerButton();
					void addScreenshotButton();
					void volumeBoost();
					void adjustVolumeOnScrollWheel();
					void adjustSpeedOnScrollWheel();
				}
			})();
		};
		const response = await waitForSpecificMessage("language", "request_data", "content");
		if (!response) return;
		const {
			data: { language }
		} = response;
		const i18nextInstance = await i18nService(language);
		window.i18nextInstance = i18nextInstance;

		// Listen to YouTube's soft navigate event
		document.addEventListener("yt-navigate-finish", (event: YoutubeNavigateEvent) => {
			const pageType = event.detail?.pageType;
			// Only run enableFeatures() if the pageType is either `watch` or `shorts`
			if (pageType === "watch" || pageType === "shorts") {
				// Log the console about detecting the soft navigation
				browserColorLog("Detected a soft navigation to player page, enabling features", "FgMagenta");

				enableFeatures();
			}
		});

		if (isWatchPage() || isShortsPage()) {
			document.addEventListener("yt-navigate-finish", enableFeatures);
			document.addEventListener("yt-player-updated", enableFeatures);
		} else {
			enableFeatures();
		}
		/**
		 * Listens for the "yte-message-from-youtube" event and handles incoming messages from the YouTube page.
		 *
		 * @returns {void}
		 */
		document.addEventListener("yte-message-from-extension", () => {
			void (async () => {
				const provider = document.querySelector("div#yte-message-from-extension");
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
							data: { volumeBoostEnabled, volumeBoostMode }
						} = message;
						if (volumeBoostEnabled) {
							if (volumeBoostMode === "global") {
								await removeVolumeBoostButton();
								await enableVolumeBoost();
							} else {
								disableVolumeBoost();
								await addVolumeBoostButton();
							}
						} else {
							disableVolumeBoost();
							if (volumeBoostMode === "per_video") {
								await removeVolumeBoostButton();
							}
						}
						break;
					}
					case "volumeBoostAmountChange": {
						const {
							data: { volumeBoostAmount }
						} = message;
						applyVolumeBoost(volumeBoostAmount);
						break;
					}
					case "playerSpeedChange": {
						const {
							data: { enableForcedPlaybackSpeed, playerSpeed }
						} = message;
						if (enableForcedPlaybackSpeed && playerSpeed) {
							await setPlayerSpeed(Number(playerSpeed));
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
							await addScreenshotButton();
						} else {
							await removeScreenshotButton();
						}
						break;
					}
					case "maximizeButtonChange": {
						const {
							data: { maximizePlayerButtonEnabled }
						} = message;
						if (maximizePlayerButtonEnabled) {
							await addMaximizePlayerButton();
						} else {
							await removeMaximizePlayerButton();
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
							await setupVideoHistory();
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
							await setupRemainingTime();
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
							await addLoopButton();
						} else {
							await removeLoopButton();
						}
						break;
					}
					case "scrollWheelVolumeControlChange": {
						const {
							data: { scrollWheelVolumeControlEnabled }
						} = message;
						if (scrollWheelVolumeControlEnabled) {
							await adjustVolumeOnScrollWheel();
						} else {
							eventManager.removeEventListeners("scrollWheelVolumeControl");
						}
						break;
					}
					case "scrollWheelSpeedControlChange": {
						const {
							data: { scrollWheelSpeedControlEnabled }
						} = message;
						if (scrollWheelSpeedControlEnabled) {
							await adjustSpeedOnScrollWheel();
						} else {
							eventManager.removeEventListeners("scrollWheelSpeedControl");
						}
						break;
					}
					case "rememberVolumeChange": {
						const {
							data: { rememberVolumeEnabled }
						} = message;
						if (rememberVolumeEnabled) {
							await enableRememberVolume();
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
					case "hideShortsChange": {
						const {
							data: { hideShortsEnabled }
						} = message;
						if (hideShortsEnabled) {
							await enableHideShorts();
						} else {
							disableHideShorts();
						}
						break;
					}
					case "languageChange": {
						const {
							data: { language }
						} = message;
						window.i18nextInstance = await i18nService(language);
						if (featuresInMenu.size > 0) {
							updateFeatureMenuTitle(window.i18nextInstance.t("pages.content.features.featureMenu.label"));
							for (const feature of featuresInMenu) {
								updateFeatureMenuItemLabel(feature, window.i18nextInstance.t(`pages.content.features.${feature}.label`));
							}
						}
						if (featuresInControls.size > 0) {
							for (const feature of featuresInControls) {
								if (toggleFeatures.includes(feature)) {
									const toggleFeature = feature as ToggleFeatures;
									const featureButton = getFeatureButton(toggleFeature);
									if (!featureButton) return;
									const buttonChecked = JSON.parse(featureButton.ariaChecked ?? "false") as boolean;
									updateFeatureButtonTitle(
										feature,
										window.i18nextInstance.t(`pages.content.features.${toggleFeature}.toggle.${buttonChecked ? "on" : "off"}`)
									);
								} else {
									updateFeatureButtonTitle(feature, window.i18nextInstance.t(`pages.content.features.${feature}.label`));
								}
							}
						}
						break;
					}
					case "automaticTheaterModeChange": {
						// Get the player element
						const playerContainer =
							isWatchPage() ? document.querySelector("div#player-container.ytd-watch-flexy")
							: isShortsPage() ? document.querySelector("div#shorts-player")
							: null;
						// If player element is not available, return
						if (!playerContainer) return;
						// Get the size button
						const sizeButton = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
						// If the size button is not available return
						if (!sizeButton) return;
						sizeButton.click();

						break;
					}
					case "featureMenuOpenTypeChange": {
						const {
							data: { featureMenuOpenType }
						} = message;
						setupFeatureMenuEventListeners(featureMenuOpenType);
						break;
					}
					case "openTranscriptButtonChange": {
						const {
							data: { openTranscriptButtonEnabled }
						} = message;
						if (openTranscriptButtonEnabled) {
							await openTranscriptButton();
						} else {
							await removeOpenTranscriptButton();
						}
						break;
					}
					case "openYTSettingsOnHoverChange": {
						const {
							data: { openYouTubeSettingsOnHoverEnabled }
						} = message;
						if (openYouTubeSettingsOnHoverEnabled) {
							await enableOpenYouTubeSettingsOnHover();
						} else {
							disableOpenYouTubeSettingsOnHover();
						}
						break;
					}
					case "removeRedirectChange": {
						const {
							data: { removeRedirectEnabled }
						} = message;
						if (removeRedirectEnabled) {
							await removeRedirect();
						}
						break;
					}
					case "shareShortenerChange": {
						const {
							data: { shareShortenerEnabled }
						} = message;
						if (shareShortenerEnabled) {
							await enableShareShortener();
						} else {
							disableShareShortener();
						}
						break;
					}
					case "customCSSChange": {
						const {
							data: { customCSSCode, customCSSEnabled }
						} = message;
						if (customCSSEnabled) {
							if (customCSSExists()) {
								updateCustomCSS({ custom_css_code: customCSSCode });
							} else {
								await enableCustomCSS();
							}
						} else {
							disableCustomCSS();
						}
						break;
					}
					case "buttonPlacementChange": {
						const {
							data: { buttonPlacement: buttonPlacements }
						} = message;
						for (const [featureName, { new: newPlacement, old: oldPlacement }] of Object.entries(buttonPlacements)) {
							const buttonExists = checkIfFeatureButtonExists(featureName, newPlacement);
							if (buttonExists) continue;
							const { [featureName]: featureFunctions } = featureButtonFunctions;
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
							const castFeatureFunctions = featureFunctions as unknown as FeatureFuncRecord;
							// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
							await castFeatureFunctions.remove(oldPlacement);
							// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
							await castFeatureFunctions.add();
						}
						break;
					}
					case "shortsAutoScrollChange": {
						const {
							data: { shortsAutoScrollEnabled }
						} = message;
						if (shortsAutoScrollEnabled) {
							await enableShortsAutoScroll();
						} else {
							disableShortsAutoScroll();
						}
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
	const {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		error: { stack: errorLine }
	} = event;
	browserColorLog(formatError(event.error) + "\nAt: " + errorLine, "FgRed");
});

window.addEventListener("unhandledrejection", (event) => {
	event.preventDefault();
	const errorLine = event.reason instanceof Error ? event?.reason?.stack : "Stack trace not available";
	browserColorLog(`Unhandled rejection: ${event.reason}\nAt: ${errorLine}`, "FgRed");
});
