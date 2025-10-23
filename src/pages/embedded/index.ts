import { deepDarkPresets } from "@/src/deepDarkPresets";
import { featureButtonFunctions, type FeatureFuncRecord } from "@/src/features";
import { disableAutomaticallyDisableAmbientMode, enableAutomaticallyDisableAmbientMode } from "@/src/features/automaticallyDisableAmbientMode";
import {
	disableAutomaticallyDisableClosedCaptions,
	enableAutomaticallyDisableClosedCaptions
} from "@/src/features/automaticallyDisableClosedCaptions";
import { disableAutomaticallyEnableClosedCaptions, enableAutomaticallyEnableClosedCaptions } from "@/src/features/automaticallyEnableClosedCaptions";
import { disableAutomaticallyMaximizePlayer, enableAutomaticallyMaximizePlayer } from "@/src/features/automaticallyMaximizePlayer";
import { enableAutomaticTheaterMode } from "@/src/features/automaticTheaterMode";
import { featuresInControls } from "@/src/features/buttonPlacement";
import { getFeatureButton, updateButtonsIconColor, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { addCopyTimestampUrlButton, removeCopyTimestampUrlButton } from "@/src/features/copyTimestampUrlButton";
import { disableCustomCSS, enableCustomCSS } from "@/src/features/customCSS";
import { customCSSExists, updateCustomCSS } from "@/src/features/customCSS/utils";
import { disableDeepDarkCSS, enableDeepDarkCSS } from "@/src/features/deepDarkCSS";
import { deepDarkCSSExists, getDeepDarkCustomThemeStyle, updateDeepDarkCSS } from "@/src/features/deepDarkCSS/utils";
import { disableDefaultToOriginalAudioTrack, enableDefaultToOriginalAudioTrack } from "@/src/features/defaultToOriginalAudioTrack";
import { enableFeatureMenu, setupFeatureMenuEventListeners } from "@/src/features/featureMenu";
import { featuresInMenu, getFeatureMenuItem, updateFeatureMenuItemLabel, updateFeatureMenuTitle } from "@/src/features/featureMenu/utils";
import { addForwardButton, addRewindButton, removeForwardButton, removeRewindButton } from "@/src/features/forwardRewindButtons";
import { disableHideArtificialIntelligenceSummary, enableHideArtificialIntelligenceSummary } from "@/src/features/hideArtificialIntelligenceSummary";
import {
	addHideEndScreenCardsButton,
	disableHideEndScreenCards,
	enableHideEndScreenCards,
	isEndScreenCardsHidden,
	removeHideEndScreenCardsButton,
	updateHideEndScreenCardsButtonState
} from "@/src/features/hideEndScreenCards";
import { disableHideLiveStreamChat, enableHideLiveStreamChat } from "@/src/features/hideLiveStreamChat";
import {
	disableHideOfficialArtistVideosFromHomePage,
	enableHideOfficialArtistVideosFromHomePage
} from "@/src/features/hideOfficialArtistVideosFromHomePage";
import { disableHidePaidPromotionBanner, enableHidePaidPromotionBanner } from "@/src/features/hidePaidPromotionBanner";
import { disableHidePlayables, enableHidePlayables } from "@/src/features/hidePlayables";
import {
	disableHidePlaylistRecommendationsFromHomePage,
	enableHidePlaylistRecommendationsFromHomePage
} from "@/src/features/hidePlaylistRecommendationsFromHomePage";
import { enableHideScrollBar } from "@/src/features/hideScrollBar";
import { hideScrollBar, showScrollBar } from "@/src/features/hideScrollBar/utils";
import { disableHideShorts, enableHideShorts } from "@/src/features/hideShorts";
import { disableHideTranslateComment, enableHideTranslateComment } from "@/src/features/hideTranslateComment";
import { addLoopButton, removeLoopButton } from "@/src/features/loopButton";
import { addMaximizePlayerButton, removeMaximizePlayerButton } from "@/src/features/maximizePlayerButton";
import { minimizePlayer } from "@/src/features/maximizePlayerButton/utils";
import { openTranscriptButton } from "@/src/features/openTranscriptButton";
import { removeOpenTranscriptButton } from "@/src/features/openTranscriptButton/utils";
import { disableOpenYouTubeSettingsOnHover, enableOpenYouTubeSettingsOnHover } from "@/src/features/openYouTubeSettingsOnHover";
import { disablePauseBackgroundPlayers, enablePauseBackgroundPlayers } from "@/src/features/pauseBackgroundPlayers";
import {
	addDecreasePlaybackSpeedButton,
	addIncreasePlaybackSpeedButton,
	calculatePlaybackButtonSpeed,
	removeDecreasePlaybackSpeedButton,
	removeIncreasePlaybackSpeedButton,
	updatePlaybackSpeedButtonTooltip
} from "@/src/features/playbackSpeedButtons";
import setPlayerQuality from "@/src/features/playerQuality";
import { restorePlayerSpeed, setPlayerSpeed, setupPlaybackSpeedChangeListener } from "@/src/features/playerSpeed";
import { disablePlaylistLength, enablePlaylistLength } from "@/src/features/playlistLength";
import { setupRemainingTime as enableRemainingTime, removeRemainingTimeDisplay } from "@/src/features/remainingTime";
import enableRememberVolume from "@/src/features/rememberVolume";
import enableRemoveRedirect from "@/src/features/removeRedirect";
import { disableRestoreFullscreenScrolling, enableRestoreFullscreenScrolling } from "@/src/features/restoreFullscreenScrolling";
import { disableSaveToWatchLaterButton, enableSaveToWatchLaterButton } from "@/src/features/saveToWatchLaterButton";
import { addScreenshotButton, removeScreenshotButton } from "@/src/features/screenshotButton";
import adjustSpeedOnScrollWheel from "@/src/features/scrollWheelSpeedControl";
import adjustVolumeOnScrollWheel from "@/src/features/scrollWheelVolumeControl";
import { disableShareShortener, enableShareShortener } from "@/src/features/shareShortener";
import { disableShortsAutoScroll, enableShortsAutoScroll } from "@/src/features/shortsAutoScroll";
import { enableSkipContinueWatching } from "@/src/features/skipContinueWatching";
import { promptUserToResumeVideo, setupVideoHistory } from "@/src/features/videoHistory";
import volumeBoost, {
	addVolumeBoostButton,
	applyVolumeBoost,
	disableVolumeBoost,
	enableVolumeBoost,
	removeVolumeBoostButton
} from "@/src/features/volumeBoost";
import { i18nService } from "@/src/i18n";
import { getFeatureIcon, type ToggleFeatures, toggleFeatures } from "@/src/icons";
import {
	type AllButtonNames,
	type ButtonPlacement,
	type ExtensionSendOnlyMessageMappings,
	type FeatureToMultiButtonMap,
	featureToMultiButtonsMap,
	type KeysOfUnion,
	type Messages,
	type MultiButtonFeatureNames,
	type MultiButtonNames,
	type SingleButtonFeatureNames,
	type SingleButtonNames,
	type YouTubePlayerDiv
} from "@/src/types";
import eventManager from "@/utils/EventManager";
import {
	browserColorLog,
	findKeyByValue,
	formatError,
	groupButtonChanges,
	isLivePage,
	isNewYouTubeVideoLayout,
	isPlaylistPage,
	isShortsPage,
	isWatchPage,
	sendContentOnlyMessage,
	waitForAllElements,
	waitForSpecificMessage
} from "@/utils/utilities";
// TODO: Add always show progressbar feature
let isFirstLoad = true;
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
function shouldEnableFeaturesFuncReturn() {
	return !(isWatchPage() || isShortsPage() || isPlaylistPage() || isLivePage());
}
let isEnablingFeatures = false;
let enableFeaturesTimeout: null | ReturnType<typeof setTimeout> = null;
function scheduleEnableFeatures() {
	if (enableFeaturesTimeout) clearTimeout(enableFeaturesTimeout);
	enableFeaturesTimeout = setTimeout(() => {
		void enableFeatures();
	}, 200);
}
const enableFeatures = async () => {
	// Don't enable features if already enabling
	if (isEnablingFeatures) return;
	isEnablingFeatures = true;
	browserColorLog(`Enabling features...`, "FgMagenta");
	try {
		const {
			data: {
				options: { button_placements }
			}
		} = await waitForSpecificMessage("options", "request_data", "content");
		// Wait for the specified container selectors to be available on the page
		await waitForAllElements(["div#player", "div#player-container"]);
		eventManager.removeAllEventListeners(["featureMenu"]);
		await Promise.all([
			enableHidePaidPromotionBanner(),
			enableHideShorts(),
			enableHidePlayables(),
			enableRemoveRedirect(),
			enableShareShortener(),
			enableSkipContinueWatching(),
			enablePauseBackgroundPlayers(),
			enableHideScrollBar(),
			enableCustomCSS(),
			enableDeepDarkCSS(),
			enableHideOfficialArtistVideosFromHomePage(),
			enableHidePlaylistRecommendationsFromHomePage(),
			enableSaveToWatchLaterButton()
		]);
		// Use a guard clause to reduce amount of times nesting code happens
		if (shouldEnableFeaturesFuncReturn()) return;
		// Enable feature menu before calling button functions
		await enableFeatureMenu();
		for (const multiButtonFeatureName of featureToMultiButtonsMap.keys()) {
			const buttonName = featureToMultiButtonsMap.get(multiButtonFeatureName)?.at(-1);
			if (!buttonName) continue;
			switch (multiButtonFeatureName) {
				case "forwardRewindButtons": {
					switch (button_placements[buttonName]) {
						case "below_player":
						case "feature_menu":
						case "player_controls_left": {
							await addRewindButton().then(addForwardButton);
							break;
						}
						// Because of how the right controls are placed in the DOM, we need to add the buttons in reverse order
						case "player_controls_right": {
							await addForwardButton().then(addRewindButton);
							break;
						}
					}
					break;
				}
				case "playbackSpeedButtons": {
					switch (button_placements[buttonName]) {
						case "below_player":
						case "feature_menu":
						case "player_controls_left": {
							await addDecreasePlaybackSpeedButton().then(addIncreasePlaybackSpeedButton);
							break;
						}
						// Because of how the right controls are placed in the DOM, we need to add the buttons in reverse order
						case "player_controls_right": {
							await addIncreasePlaybackSpeedButton().then(addDecreasePlaybackSpeedButton);
							break;
						}
					}
				}
			}
		}
		await Promise.all([
			promptUserToResumeVideo(() => void setupVideoHistory()),
			setupPlaybackSpeedChangeListener(),
			enableShortsAutoScroll(),
			enableOpenYouTubeSettingsOnHover(),
			enableHideLiveStreamChat(),
			enableRememberVolume(),
			enableAutomaticTheaterMode(),
			enableRemainingTime(),
			setPlayerQuality(),
			setPlayerSpeed(),
			adjustVolumeOnScrollWheel(),
			adjustSpeedOnScrollWheel(),
			enableHideTranslateComment(),
			enableHideEndScreenCards(),
			enablePlaylistLength(),
			enableAutomaticallyDisableClosedCaptions(),
			enableAutomaticallyEnableClosedCaptions(),
			enableAutomaticallyDisableAmbientMode(),
			enableDefaultToOriginalAudioTrack(),
			enableRestoreFullscreenScrolling(),
			enableAutomaticallyMaximizePlayer()
		]);
		// Features that add buttons should be put below and be ordered in the order those buttons should appear
		await addHideEndScreenCardsButton();
		await addScreenshotButton();
		await openTranscriptButton();
		await addMaximizePlayerButton();
		await addLoopButton();
		await addCopyTimestampUrlButton();
		await volumeBoost();
	} finally {
		isEnablingFeatures = false;
	}
};
const getFeatureFunctions = (featureName: AllButtonNames, oldPlacement: ButtonPlacement) => {
	const { [featureName]: featureFunctions } = featureButtonFunctions;
	// Ensure featureFunctions exist before proceeding
	if (!featureFunctions) {
		throw new Error(`Feature '${featureName}' not found in featureButtonFunctions`);
	}
	// Cast featureFunctions to FeatureFuncRecord
	const castFeatureFunctions = featureFunctions as unknown as FeatureFuncRecord;
	return {
		add: () => castFeatureFunctions.add(),
		remove: () => castFeatureFunctions.remove(oldPlacement)
	};
};
function handleSoftNavigate() {
	// Remove existing listeners
	document.removeEventListener("yt-navigate-finish", scheduleEnableFeatures);
	document.removeEventListener("yt-player-updated", scheduleEnableFeatures);
	// Add listeners
	document.addEventListener("yt-navigate-finish", scheduleEnableFeatures);
	document.addEventListener("yt-player-updated", scheduleEnableFeatures);
}
const initialize = function () {
	void (async () => {
		const response = await waitForSpecificMessage("language", "request_data", "content");
		if (!response) return;
		const {
			data: { language }
		} = response;
		const i18nextInstance = await i18nService(language);
		window.i18nextInstance = i18nextInstance;
		if (isFirstLoad) {
			void enableFeatures();
			handleSoftNavigate();
		} else if (!isFirstLoad) {
			handleSoftNavigate();
		}
		isFirstLoad = false;
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
					case "automaticallyDisableAmbientModeChange": {
						const {
							data: { automaticallyDisableAmbientModeEnabled }
						} = message;
						if (automaticallyDisableAmbientModeEnabled) {
							await enableAutomaticallyDisableAmbientMode();
						} else {
							await disableAutomaticallyDisableAmbientMode();
						}
						break;
					}
					case "automaticallyDisableClosedCaptionsChange": {
						const {
							data: { automaticallyDisableClosedCaptionsEnabled }
						} = message;
						if (automaticallyDisableClosedCaptionsEnabled) {
							await enableAutomaticallyDisableClosedCaptions();
						} else {
							await disableAutomaticallyDisableClosedCaptions();
						}
						break;
					}
					case "automaticallyEnableClosedCaptionsChange": {
						const {
							data: { automaticallyEnableClosedCaptionsEnabled }
						} = message;
						if (automaticallyEnableClosedCaptionsEnabled) {
							await enableAutomaticallyEnableClosedCaptions();
						} else {
							await disableAutomaticallyEnableClosedCaptions();
						}
						break;
					}
					case "automaticallyMaximizePlayerChange": {
						const {
							data: { automaticallyMaximizePlayerEnabled }
						} = message;
						if (automaticallyMaximizePlayerEnabled) await enableAutomaticallyMaximizePlayer();
						else disableAutomaticallyMaximizePlayer();
						break;
					}
					case "automaticTheaterModeChange": {
						// Get the player element
						const playerContainer =
							isWatchPage() ?
								document.querySelector<HTMLDivElement>(
									isNewYouTubeVideoLayout() ? "div#player-container.ytd-watch-grid" : "div#player-container.ytd-watch-flexy"
								)
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
					case "buttonPlacementChange": {
						const { data } = message;
						const { multiButtonChanges, singleButtonChanges } = groupButtonChanges(data);
						for (const [featureName, changes] of Object.entries(multiButtonChanges)) {
							switch (featureName) {
								case "forwardRewindButtons": {
									for (const [buttonName, { new: newPlacement, old: oldPlacement }] of Object.entries(changes)) {
										if (oldPlacement === newPlacement) continue;
										const rewindButtonFuncs = getFeatureFunctions("rewindButton", oldPlacement);
										const forwardButtonFuncs = getFeatureFunctions("forwardButton", oldPlacement);
										switch (buttonName) {
											case "forwardButton":
											case "rewindButton": {
												await forwardButtonFuncs.remove();
												await rewindButtonFuncs.remove();
												switch (newPlacement) {
													case "below_player":
													case "feature_menu":
													case "player_controls_left": {
														await rewindButtonFuncs.add().then(forwardButtonFuncs.add);
														break;
													}
													// Because of how the right controls are placed in the DOM, we need to add the buttons in reverse order
													case "player_controls_right": {
														await forwardButtonFuncs.add().then(rewindButtonFuncs.add);
														break;
													}
												}
											}
										}
									}
									break;
								}
								case "playbackSpeedButtons": {
									for (const [buttonName, { new: newPlacement, old: oldPlacement }] of Object.entries(changes)) {
										if (oldPlacement === newPlacement) continue;
										const increasePlaybackSpeedButtonFuncs = getFeatureFunctions("increasePlaybackSpeedButton", oldPlacement);
										const decreasePlaybackSpeedButtonFuncs = getFeatureFunctions("decreasePlaybackSpeedButton", oldPlacement);
										await decreasePlaybackSpeedButtonFuncs.remove();
										await increasePlaybackSpeedButtonFuncs.remove();
										switch (buttonName) {
											case "decreasePlaybackSpeedButton":
											case "increasePlaybackSpeedButton": {
												switch (newPlacement) {
													case "below_player":
													case "feature_menu":
													case "player_controls_left": {
														await decreasePlaybackSpeedButtonFuncs.add().then(increasePlaybackSpeedButtonFuncs.add);
														break;
													}
													// Because of how the right controls are placed in the DOM, we need to add the buttons in reverse order
													case "player_controls_right": {
														await increasePlaybackSpeedButtonFuncs.add().then(decreasePlaybackSpeedButtonFuncs.add);
														break;
													}
												}
											}
										}
									}
								}
							}
						}
						for (const [featureName, { new: newPlacement, old: oldPlacement }] of Object.entries(singleButtonChanges)) {
							if (oldPlacement === newPlacement) continue;
							const featureFuncs = getFeatureFunctions(featureName, oldPlacement);
							await featureFuncs.remove();
							await featureFuncs.add();
						}
						break;
					}

					case "copyTimestampUrlButtonChange": {
						const {
							data: { copyTimestampUrlButtonEnabled }
						} = message;
						if (copyTimestampUrlButtonEnabled) {
							await addCopyTimestampUrlButton();
						} else {
							await removeCopyTimestampUrlButton();
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
					case "deepDarkThemeChange": {
						const {
							data: { deepDarkCustomThemeColors, deepDarkPreset, deepDarkThemeEnabled }
						} = message;
						if (deepDarkThemeEnabled) {
							if (deepDarkCSSExists()) {
								updateDeepDarkCSS(
									deepDarkPreset === "Custom" ? getDeepDarkCustomThemeStyle(deepDarkCustomThemeColors) : deepDarkPresets[deepDarkPreset]
								);
							} else {
								await enableDeepDarkCSS();
							}
						} else {
							disableDeepDarkCSS();
						}
						updateButtonsIconColor();
						break;
					}
					case "defaultToOriginalAudioTrackChange": {
						const {
							data: { defaultToOriginalAudioTrackEnabled }
						} = message;
						if (defaultToOriginalAudioTrackEnabled) {
							await enableDefaultToOriginalAudioTrack();
						} else {
							await disableDefaultToOriginalAudioTrack();
						}
						break;
					}
					case "featureMenuOpenTypeChange": {
						const {
							data: { featureMenuOpenType }
						} = message;
						setupFeatureMenuEventListeners(featureMenuOpenType);
						break;
					}
					case "forwardRewindButtonsChange": {
						const {
							data: { forwardRewindButtonsEnabled }
						} = message;
						const {
							data: {
								options: {
									button_placements: { forwardButton: forwardButtonPlacement }
								}
							}
						} = await waitForSpecificMessage("options", "request_data", "content");
						await removeForwardButton();
						await removeRewindButton();
						if (forwardRewindButtonsEnabled) {
							switch (forwardButtonPlacement) {
								case "below_player":
								case "feature_menu":
								case "player_controls_left": {
									await addRewindButton().then(addForwardButton);
									break;
								}
								// Because of how the right controls are placed in the DOM, we need to add the buttons in reverse order
								case "player_controls_right": {
									await addForwardButton().then(addRewindButton);
									break;
								}
							}
						} else {
							await removeRewindButton();
							await removeForwardButton();
						}
						break;
					}
					case "hideArtificialIntelligenceSummaryChange": {
						const {
							data: { hideArtificialIntelligenceSummaryEnabled }
						} = message;
						if (hideArtificialIntelligenceSummaryEnabled) {
							await enableHideArtificialIntelligenceSummary();
						} else {
							await disableHideArtificialIntelligenceSummary();
						}
						break;
					}
					case "hideEndScreenCardsButtonChange": {
						const {
							data: { hideEndScreenCardsButtonEnabled }
						} = message;
						if (hideEndScreenCardsButtonEnabled) await addHideEndScreenCardsButton();
						else await removeHideEndScreenCardsButton();
						break;
					}
					case "hideEndScreenCardsChange": {
						const {
							data: { hideEndScreenCardsButtonPlacement: hideEndScreenCardsPlacement, hideEndScreenCardsEnabled }
						} = message;
						const endScreenCardsHidden = await isEndScreenCardsHidden();
						const hideEndScreenCardsIcon = getFeatureIcon("hideEndScreenCardsButton", "below_player");
						if (hideEndScreenCardsIcon instanceof SVGSVGElement) return;
						if (hideEndScreenCardsEnabled && !endScreenCardsHidden) {
							await enableHideEndScreenCards();
							updateHideEndScreenCardsButtonState(hideEndScreenCardsPlacement, hideEndScreenCardsIcon, false);
						} else if (!hideEndScreenCardsEnabled && endScreenCardsHidden) {
							await disableHideEndScreenCards();
							updateHideEndScreenCardsButtonState(hideEndScreenCardsPlacement, hideEndScreenCardsIcon, true);
						}
						break;
					}
					case "hideLiveStreamChatChange": {
						const {
							data: { hideLiveStreamChatEnabled }
						} = message;
						if (hideLiveStreamChatEnabled) {
							await enableHideLiveStreamChat();
						} else {
							await disableHideLiveStreamChat();
						}
						break;
					}
					case "hideOfficialArtistVideosFromHomePageChange": {
						const {
							data: { hideOfficialArtistVideosFromHomePageEnabled }
						} = message;
						if (hideOfficialArtistVideosFromHomePageEnabled) {
							await enableHideOfficialArtistVideosFromHomePage();
						} else {
							disableHideOfficialArtistVideosFromHomePage();
						}
						break;
					}
					case "hidePaidPromotionBannerChange": {
						const {
							data: { hidePaidPromotionBannerEnabled }
						} = message;
						if (hidePaidPromotionBannerEnabled) {
							await enableHidePaidPromotionBanner();
						} else {
							disableHidePaidPromotionBanner();
						}
						break;
					}
					case "hidePlayablesChange": {
						const {
							data: { hidePlayablesEnabled }
						} = message;
						if (hidePlayablesEnabled) {
							await enableHidePlayables();
						} else {
							await disableHidePlayables();
						}
						break;
					}
					case "hidePlaylistRecommendationsFromHomePageChange": {
						const {
							data: { hidePlaylistRecommendationsFromHomePageEnabled }
						} = message;
						if (hidePlaylistRecommendationsFromHomePageEnabled) {
							await enableHidePlaylistRecommendationsFromHomePage();
						} else {
							disableHidePlaylistRecommendationsFromHomePage();
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
							await disableHideShorts();
						}
						break;
					}
					case "hideTranslateCommentChange": {
						const {
							data: { hideTranslateCommentEnabled }
						} = message;
						if (hideTranslateCommentEnabled) await enableHideTranslateComment();
						else await disableHideTranslateComment();
						break;
					}
					case "languageChange": {
						const {
							data: { language }
						} = message;
						window.i18nextInstance = await i18nService(language);
						const {
							data: { options }
						} = await waitForSpecificMessage("options", "request_data", "content");
						if (featuresInMenu.size > 0) {
							updateFeatureMenuTitle(window.i18nextInstance.t("pages.content.features.featureMenu.button.label"));
							for (const feature of featuresInMenu) {
								const featureName = findKeyByValue(feature as MultiButtonNames) ?? (feature as SingleButtonFeatureNames);
								if (featureToMultiButtonsMap.has(featureName)) {
									const multiFeatureName = featureName as MultiButtonFeatureNames;
									const multiButtonName = feature as MultiButtonNames;
									switch (multiFeatureName) {
										case "playbackSpeedButtons": {
											updateFeatureMenuItemLabel(
												feature,
												window.i18nextInstance.t(
													`pages.content.features.${multiFeatureName}.buttons.${multiButtonName}.label` as `pages.content.features.${typeof multiFeatureName}.buttons.${KeysOfUnion<FeatureToMultiButtonMap[typeof multiFeatureName]>}.label`,
													{
														SPEED: options.playback_buttons_speed
													}
												)
											);
											break;
										}
									}
								} else {
									updateFeatureMenuItemLabel(
										feature,
										window.i18nextInstance.t(`pages.content.features.${featureName as SingleButtonNames}.button.label`)
									);
								}
							}
						}
						if (featuresInControls.size > 0) {
							for (const feature of featuresInControls) {
								const featureName = findKeyByValue(feature as MultiButtonNames) ?? (feature as SingleButtonFeatureNames);
								if (toggleFeatures.includes(feature)) {
									const toggleFeature = feature as ToggleFeatures;
									const featureButton = getFeatureButton(toggleFeature);
									if (!featureButton) return;
									const buttonChecked = JSON.parse(featureButton.ariaChecked ?? "false") as boolean;
									updateFeatureButtonTitle(
										toggleFeature,
										window.i18nextInstance.t(`pages.content.features.${toggleFeature}.button.toggle.${buttonChecked ? "on" : "off"}`)
									);
								} else {
									if (featureToMultiButtonsMap.has(featureName)) {
										const multiFeatureName = featureName as MultiButtonFeatureNames;
										const multiButtonName = feature as MultiButtonNames;
										switch (multiFeatureName) {
											case "playbackSpeedButtons": {
												updateFeatureMenuItemLabel(
													feature,
													window.i18nextInstance.t(
														`pages.content.features.${multiFeatureName}.buttons.${multiButtonName}.label` as `pages.content.features.${typeof multiFeatureName}.buttons.${KeysOfUnion<FeatureToMultiButtonMap[typeof multiFeatureName]>}.label`,
														{
															SPEED: options.playback_buttons_speed
														}
													)
												);
												break;
											}
										}
									} else {
										updateFeatureButtonTitle(
											feature,
											window.i18nextInstance.t(`pages.content.features.${featureName as SingleButtonNames}.button.label`)
										);
									}
								}
							}
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
					case "maximizeButtonChange": {
						const {
							data: { maximizePlayerButtonEnabled }
						} = message;
						if (maximizePlayerButtonEnabled) {
							await addMaximizePlayerButton();
						} else {
							await removeMaximizePlayerButton();
							minimizePlayer();
						}
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
					case "pauseBackgroundPlayersChange": {
						const {
							data: { pauseBackgroundPlayersEnabled }
						} = message;
						if (pauseBackgroundPlayersEnabled) {
							await enablePauseBackgroundPlayers();
						} else {
							disablePauseBackgroundPlayers();
						}
						break;
					}
					case "playbackSpeedButtonsChange": {
						const {
							data: { playbackSpeedButtonsEnabled }
						} = message;
						const {
							data: {
								options: {
									button_placements: { decreasePlaybackSpeedButton: decreasePlaybackSpeedButtonPlacement }
								}
							}
						} = await waitForSpecificMessage("options", "request_data", "content");
						if (playbackSpeedButtonsEnabled) {
							await removeDecreasePlaybackSpeedButton();
							await removeIncreasePlaybackSpeedButton();
							switch (decreasePlaybackSpeedButtonPlacement) {
								case "below_player":
								case "feature_menu":
								case "player_controls_left": {
									await addDecreasePlaybackSpeedButton().then(addIncreasePlaybackSpeedButton);
									break;
								}
								// Because of how the right controls are placed in the DOM, we need to add the buttons in reverse order
								case "player_controls_right": {
									await addIncreasePlaybackSpeedButton().then(addDecreasePlaybackSpeedButton);
									break;
								}
							}
						} else {
							await removeDecreasePlaybackSpeedButton();
							await removeIncreasePlaybackSpeedButton();
						}
						break;
					}
					case "playerSpeedChange": {
						const {
							data: { enableForcedPlaybackSpeed, playerSpeed }
						} = message;
						const {
							data: {
								options: { playback_buttons_speed: playbackSpeedPerClick }
							}
						} = await waitForSpecificMessage("options", "request_data", "content");
						if (enableForcedPlaybackSpeed && playerSpeed) {
							await updatePlaybackSpeedButtonTooltip(
								"increasePlaybackSpeedButton",
								calculatePlaybackButtonSpeed(playerSpeed, playbackSpeedPerClick, "increase")
							);
							await updatePlaybackSpeedButtonTooltip(
								"decreasePlaybackSpeedButton",
								calculatePlaybackButtonSpeed(playerSpeed, playbackSpeedPerClick, "decrease")
							);
							await setPlayerSpeed(Number(playerSpeed));
						} else if (!enableForcedPlaybackSpeed) {
							await restorePlayerSpeed();
							const videoElement = document.querySelector<HTMLVideoElement>("video");
							if (!videoElement) return;
							const { playbackRate: currentSpeed } = videoElement;
							await updatePlaybackSpeedButtonTooltip(
								"increasePlaybackSpeedButton",
								calculatePlaybackButtonSpeed(currentSpeed, playbackSpeedPerClick, "increase")
							);
							await updatePlaybackSpeedButtonTooltip(
								"decreasePlaybackSpeedButton",
								calculatePlaybackButtonSpeed(currentSpeed, playbackSpeedPerClick, "decrease")
							);
						}
						break;
					}
					case "playlistLengthChange": {
						const {
							data: { playlistLengthEnabled }
						} = message;
						if (playlistLengthEnabled) {
							await enablePlaylistLength();
						} else {
							disablePlaylistLength();
						}
						break;
					}
					case "playlistLengthGetMethodChange":
					case "playlistWatchTimeGetMethodChange": {
						disablePlaylistLength();
						await enablePlaylistLength();
						break;
					}
					case "remainingTimeChange": {
						const {
							data: { remainingTimeEnabled }
						} = message;
						if (remainingTimeEnabled) {
							await enableRemainingTime();
						} else {
							await removeRemainingTimeDisplay();
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
					case "removeRedirectChange": {
						const {
							data: { removeRedirectEnabled }
						} = message;
						if (removeRedirectEnabled) {
							await enableRemoveRedirect();
						}
						break;
					}
					case "restoreFullscreenScrollingChange": {
						const {
							data: { restoreFullscreenScrollingEnabled }
						} = message;
						if (restoreFullscreenScrollingEnabled) {
							await enableRestoreFullscreenScrolling();
						} else {
							await disableRestoreFullscreenScrolling();
						}
						break;
					}
					case "saveToWatchLaterButtonChange": {
						const {
							data: { saveToWatchLaterButtonEnabled }
						} = message;
						if (saveToWatchLaterButtonEnabled) {
							await enableSaveToWatchLaterButton();
						} else {
							await disableSaveToWatchLaterButton();
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
					case "skipContinueWatchingChange": {
						const {
							data: { skipContinueWatchingEnabled }
						} = message;
						if (skipContinueWatchingEnabled) {
							await enableSkipContinueWatching();
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
					case "volumeBoostAmountChange": {
						const {
							data: { volumeBoostAmount, volumeBoostEnabled, volumeBoostMode }
						} = message;
						switch (volumeBoostMode) {
							case "global": {
								if (!volumeBoostEnabled) return;
								applyVolumeBoost(volumeBoostAmount);
								break;
							}
							case "per_video": {
								const volumeBoostButton = getFeatureMenuItem("volumeBoostButton") ?? getFeatureButton("volumeBoostButton");
								if (!volumeBoostButton) return;
								const volumeBoostForVideoEnabled = volumeBoostButton.ariaChecked === "true";
								if (volumeBoostForVideoEnabled) applyVolumeBoost(volumeBoostAmount);
							}
						}
						break;
					}
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
					default: {
						return;
					}
				}
			})();
		});
		sendContentOnlyMessage("pageLoaded", undefined);
	})();
};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initialize);
} else {
	initialize();
}

window.onbeforeunload = function () {
	eventManager.removeAllEventListeners();
	element.remove();
};

// Error handling
window.addEventListener("error", (event) => {
	event.preventDefault();
	const errorLine = event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`;
	const errorMessage = event.error ? formatError(event.error) : event.message || "Unknown error";
	browserColorLog(errorMessage + "\nAt: " + errorLine, "FgRed");
});

window.addEventListener("unhandledrejection", (event) => {
	event.preventDefault();
	const errorLine = event.reason instanceof Error && event.reason?.stack ? event.reason.stack : "Stack trace not available";
	browserColorLog(`Unhandled rejection: ${event.reason}\nAt: ${errorLine}`, "FgRed");
});
