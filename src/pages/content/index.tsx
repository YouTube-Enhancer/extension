import {
	MessageData,
	MessageTypes,
	OnScreenDisplayColor,
	OnScreenDisplayPosition,
	OnScreenDisplayType,
	VideoHistoryEntry,
	VideoHistoryStatus,
	VideoHistoryStorage,
	YoutubePlayerQualityLabel,
	YoutubePlayerQualityLevel
} from "@/src/types";
// TODO: Add remaining time feature
// TODO: Add always show progressbar feature
// TODO: Fix double running of code from video reloading when page first loads

// Centralized Event Manager
type EventCallback<K extends keyof HTMLElementEventMap> = (event: HTMLElementEventMap[K]) => void;

interface EventListenerInfo<K extends keyof ElementEventMap> {
	target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap];
	eventName: K;
	callback: EventCallback<K>;
}

type TargetedListeners<K extends keyof ElementEventMap> = Map<HTMLElementTagNameMap[keyof HTMLElementTagNameMap], EventListenerInfo<K>>;

type EventManager = {
	listeners: Map<string, TargetedListeners<keyof ElementEventMap>>;

	addEventListener: <T extends keyof HTMLElementEventMap>(
		target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap],
		eventName: T,
		callback: EventCallback<keyof HTMLElementEventMap>,
		featureName: string
	) => void;

	removeEventListener: <T extends keyof HTMLElementEventMap>(
		target: HTMLElementTagNameMap[keyof HTMLElementTagNameMap],
		eventName: T,
		featureName: string
	) => void;

	removeEventListeners: (featureName: string) => void;

	removeAllEventListeners: () => void;
};

const eventManager: EventManager = {
	listeners: new Map(),

	addEventListener: function (target, eventName, callback, featureName) {
		const targetListeners = this.listeners.get(featureName) || new Map();
		targetListeners.set(target, { eventName, callback });
		this.listeners.set(featureName, targetListeners);
		target.addEventListener(eventName, callback);
	},

	removeEventListener: function (target, eventName, featureName) {
		const targetListeners = this.listeners.get(featureName);
		if (targetListeners) {
			const listenerInfo = targetListeners.get(target);
			if (listenerInfo) {
				target.removeEventListener(eventName, listenerInfo.callback);
				targetListeners.delete(target);
			}
			if (targetListeners.size === 0) {
				this.listeners.delete(featureName);
			}
		}
	},

	removeEventListeners: function (featureName) {
		const targetListeners = this.listeners.get(featureName);
		if (targetListeners) {
			targetListeners.forEach(({ target, eventName, callback }) => {
				target.removeEventListener(eventName, callback);
			});
			this.listeners.delete(featureName);
		}
	},

	removeAllEventListeners: function () {
		this.listeners.forEach((targetListeners) => {
			targetListeners.forEach(({ target, eventName, callback }) => {
				target.removeEventListener(eventName, callback);
			});
		});
		this.listeners.clear();
	}
};

import { browserColorLog, chooseClosetQuality, clamp, round, toDivisible } from "../../utils/utilities";
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
import type { YouTubePlayer } from "node_modules/@types/youtube-player/dist/types";
import { YoutubePlayerQualityLabels, YoutubePlayerQualityLevels } from "../../utils/constants";
type Selector = string;
type YouTubePlayerDiv = YouTubePlayer & HTMLDivElement;
/**
 * Creates a hidden div element with a specific ID that can be used to receive messages from YouTube.
 * The element is appended to the document's root element.
 */
const element = document.createElement("div");
element.style.display = "none";
element.id = "yte-message-from-youtube";
document.documentElement.appendChild(element);
// #region Video History
function getVideoHistory() {
	return JSON.parse(window.localStorage.getItem("videoHistory") ?? "{}") as VideoHistoryStorage;
}
function addToHistory(videoId: string, timestamp: number, status: VideoHistoryStatus) {
	const history = getVideoHistory();
	const videoHistoryItem = { id: videoId, timestamp, status } satisfies VideoHistoryEntry;
	history[videoId] = videoHistoryItem;
	window.localStorage.setItem("videoHistory", JSON.stringify(history));
}
function updateVideoHistory(videoId: string, timestamp: number) {
	const history = getVideoHistory();
	const { [videoId]: videoHistoryItem } = history;
	if (videoHistoryItem) {
		videoHistoryItem.timestamp = timestamp;
	}
	window.localStorage.setItem("videoHistory", JSON.stringify(history));
}
function checkVideoStatus(videoId: string) {
	const history = getVideoHistory();
	const { [videoId]: videoHistoryItem } = history;
	if (videoHistoryItem) {
		return videoHistoryItem.status;
	}
	return "unwatched";
}
function markVideoAsWatched(videoId: string) {
	const history = getVideoHistory();
	const { [videoId]: videoHistoryItem } = history;
	if (videoHistoryItem) {
		videoHistoryItem.status = "watched";
	}
	window.localStorage.setItem("videoHistory", JSON.stringify(history));
}
async function setupVideoHistory() {
	// Wait for the "options" message from the content script
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });
	// If options are not available, return
	if (!options) return;
	const { enable_video_history: enableVideoHistory } = options;
	if (!enableVideoHistory) return;
	// Get the player container element
	const playerContainer = isWatchPage() ? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null) : isShortsPage() ? null : null;
	// If player container is not available, return
	if (!playerContainer) return;
	const { video_id: videoId } = await playerContainer.getVideoData();
	if (!videoId) return;
	const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
	if (!videoElement) return;

	const { [videoId]: videoHistory } = getVideoHistory();
	if (videoHistory && videoHistory.status === "watching" && videoHistory.timestamp > 0) {
		promptUserToResumeVideo(videoHistory.timestamp);
	}

	const videoPlayerTimeUpdateListener = async () => {
		const currentTime = await playerContainer.getCurrentTime();
		const duration = await playerContainer.getDuration();
		const videoStatus = checkVideoStatus(videoId);
		if (Math.ceil(duration) === Math.ceil(currentTime)) {
			markVideoAsWatched(videoId);
		} else {
			if (videoStatus === "unwatched") {
				addToHistory(videoId, currentTime, "watching");
			} else {
				updateVideoHistory(videoId, currentTime);
			}
		}
	};
	eventManager.addEventListener(videoElement, "timeupdate", videoPlayerTimeUpdateListener, "videoHistory");
}
async function promptUserToResumeVideo(timestamp: number) {
	// Get the player container element
	const playerContainer = isWatchPage() ? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null) : isShortsPage() ? null : null;

	// If player container is not available, return
	if (!playerContainer) return;

	const { video_id: videoId } = await playerContainer.getVideoData();
	if (!videoId) return;

	// Check if the prompt element already exists
	const prompt = document.getElementById("resume-prompt") ?? document.createElement("div");
	// Check if the prompt progressbar already exists
	const progressBar = document.getElementById("resume-prompt-progressbar") ?? document.createElement("div");
	const progressBarDuration = 15;
	// Create a countdown timer
	let countdown = progressBarDuration; // Countdown in seconds
	const countdownInterval = setInterval(() => {
		countdown--;
		progressBar.style.width = `${(countdown / progressBarDuration) * 100}%`; // Update the progress bar

		if (countdown <= 0) {
			// Automatically hide the prompt when the countdown reaches 0
			clearInterval(countdownInterval);
			prompt.style.display = "none";
		}
	}, 1000);
	if (!document.getElementById("resume-prompt-progressbar")) {
		progressBar.id = "resume-prompt-progressbar";
		progressBar.style.width = "100%";
		progressBar.style.height = "10px"; // Height of the progress bar
		progressBar.style.backgroundColor = "#007acc"; // Progress bar color
		progressBar.style.position = "absolute";
		progressBar.style.zIndex = "1000"; // Adjust as needed
		progressBar.style.left = "0"; // Place at the left of the prompt
		progressBar.style.bottom = "0"; // Place at the bottom of the prompt
		progressBar.style.transition = "all 0.5s ease-in-out";
		progressBar.style.borderBottomRightRadius = "5px";
		progressBar.style.borderBottomLeftRadius = "5px";
		prompt.appendChild(progressBar);
	}
	// Create the prompt element if it doesn't exist
	if (!document.getElementById("resume-prompt")) {
		prompt.id = "resume-prompt";
		prompt.style.position = "fixed";
		prompt.style.bottom = "10px"; // Adjust as needed
		prompt.style.right = "10px"; // Adjust as needed
		prompt.style.backgroundColor = "#181a1b";
		prompt.style.padding = "10px";
		prompt.style.paddingBottom = "20px";
		prompt.style.transition = "all 0.5s ease-in-out";
		prompt.style.borderRadius = "5px";
		prompt.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
		prompt.style.zIndex = "25000";
		document.body.appendChild(prompt);

		// Create a resume button
		const resumeButton = document.createElement("button");
		resumeButton.textContent = "Resume";

		resumeButton.style.backgroundColor = "hsl(213, 80%, 50%)";
		resumeButton.style.border = "transparent";
		resumeButton.style.color = "white";
		resumeButton.style.padding = "10px 20px";
		resumeButton.style.borderRadius = "5px";
		resumeButton.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
		resumeButton.style.cursor = "pointer";
		resumeButton.style.fontSize = "1.5em";
		resumeButton.style.fontWeight = "bold";
		resumeButton.style.textAlign = "center";
		resumeButton.style.verticalAlign = "middle";
		resumeButton.style.transition = "all 0.5s ease-in-out";
		const resumeButtonClickListener = () => {
			// Hide the prompt and clear the countdown timer
			clearInterval(countdownInterval);
			prompt.style.display = "none";
			browserColorLog(`Resuming video`, "FgGreen");
			playerContainer.seekTo(timestamp, true);
		};
		eventManager.addEventListener(resumeButton, "click", resumeButtonClickListener, "videoHistory");

		prompt.appendChild(resumeButton);
	}

	// Display the prompt
	prompt.style.display = "block";
}

// #endregion Video History
// TODO: make sure listeners are cleaned up properly before re adding them
let wasInTheatreMode = false;
let setToTheatreMode = false;
// #region Main functions
async function takeScreenshot(videoElement: HTMLVideoElement) {
	try {
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		const { videoWidth, videoHeight } = videoElement;
		canvas.width = videoWidth;
		canvas.height = videoHeight;
		if (!context) return;

		context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

		const { options } = await waitForSpecificMessage("options", { source: "content_script" });
		if (!options) return;
		const { screenshot_save_as, screenshot_format } = options;
		const format = `image/${screenshot_format}`;

		const dataUrl = canvas.toDataURL(format);

		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
		if (!blob) return;

		switch (screenshot_save_as) {
			case "clipboard": {
				const screenshotTooltip = document.querySelector("div#yte-screenshot-tooltip");
				if (screenshotTooltip) {
					const clipboardImage = new ClipboardItem({ "image/png": blob });
					navigator.clipboard.write([clipboardImage]);
					navigator.clipboard.writeText(dataUrl);
					screenshotTooltip.textContent = "Screenshot copied to clipboard";
				}
				break;
			}
			case "file": {
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const a = document.createElement("a");
				a.href = URL.createObjectURL(blob);
				a.download = `Screenshot-${location.href.match(/[\?|\&]v=([^&]+)/)?.[1]}-${timestamp}.${screenshot_format}`;
				a.click();
				break;
			}
		}
	} catch (error) {}
}

async function addScreenshotButton(): Promise<void> {
	// Wait for the "options" message from the content script
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });

	// If options are not available, return
	if (!options) return;

	// Extract the necessary properties from the options object
	const { enable_screenshot_button: enableScreenshotButton } = options;
	// If the screenshot button option is disabled, return
	if (!enableScreenshotButton) return;
	const screenshotButtonExists = document.querySelector("button.yte-screenshot-button") as HTMLButtonElement | null;
	// If screenshot button already exists, return
	if (screenshotButtonExists) return;
	// Get the volume control element
	const volumeControl = document.querySelector("div.ytp-chrome-controls > div.ytp-left-controls > span.ytp-volume-area") as HTMLSpanElement | null;
	// If volume control element is not available, return
	if (!volumeControl) return;
	// Create the screenshot button element
	const screenshotButton = document.createElement("button");
	screenshotButton.classList.add("ytp-button");
	screenshotButton.classList.add("yte-screenshot-button");
	screenshotButton.dataset.title = "Screenshot";
	screenshotButton.style.padding = "0px";
	screenshotButton.style.display = "flex";
	screenshotButton.style.alignItems = "center";
	screenshotButton.style.justifyContent = "center";
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.style.height = "28px";
	svg.style.width = "28px";
	svg.setAttributeNS(null, "stroke-width", "1.5");
	svg.setAttributeNS(null, "stroke", "currentColor");
	svg.setAttributeNS(null, "fill", "none");
	svg.setAttributeNS(null, "viewBox", "0 0 24 24");
	const firstPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	firstPath.setAttributeNS(
		null,
		"d",
		"M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
	);
	firstPath.setAttributeNS(null, "stroke-linecap", "round");
	firstPath.setAttributeNS(null, "stroke-linejoin", "round");
	const secondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	secondPath.setAttributeNS(null, "d", "M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z");
	secondPath.setAttributeNS(null, "stroke-linecap", "round");
	secondPath.setAttributeNS(null, "stroke-linejoin", "round");
	svg.appendChild(firstPath);
	svg.appendChild(secondPath);
	screenshotButton.appendChild(svg);
	// Add a click event listener to the screenshot button
	async function screenshotButtonClickListener() {
		// Get the video element
		const videoElement = document.querySelector("video") as HTMLVideoElement | null;
		// If video element is not available, return
		if (!videoElement) return;
		try {
			// Take a screenshot
			await takeScreenshot(videoElement);
		} catch (error) {
			console.error(error);
		}
	}
	function screenshotButtonMouseOverListener() {
		// Create tooltip element
		const tooltip = document.createElement("div");
		const rect = screenshotButton.getBoundingClientRect();
		tooltip.classList.add("yte-button-tooltip");
		tooltip.classList.add("ytp-tooltip");
		tooltip.classList.add("ytp-rounded-tooltip");
		tooltip.classList.add("ytp-bottom");
		tooltip.id = "yte-screenshot-tooltip";
		tooltip.style.left = `${rect.left + rect.width / 2}px`;
		tooltip.style.top = `${rect.top - 2}px`;
		tooltip.style.zIndex = "2021";
		const {
			dataset: { title }
		} = screenshotButton;
		tooltip.textContent = title ?? "Screenshot";
		function mouseLeaveListener() {
			tooltip.remove();
			eventManager.removeEventListener(screenshotButton, "mouseleave", "screenshotButton");
		}
		eventManager.addEventListener(screenshotButton, "mouseleave", mouseLeaveListener, "screenshotButton");
		document.body.appendChild(tooltip);
	}

	// Append the screenshot button to before the volume control element
	volumeControl.before(screenshotButton);
	eventManager.addEventListener(screenshotButton, "click", screenshotButtonClickListener, "screenshotButton");
	eventManager.addEventListener(screenshotButton, "mouseover", screenshotButtonMouseOverListener, "screenshotButton");
}
async function removeScreenshotButton(): Promise<void> {
	// Try to get the existing screenshot button element
	const screenshotButton = document.querySelector("button.yte-screenshot-button") as HTMLButtonElement | null;
	// If screenshot button is not available, return
	if (!screenshotButton) return;
	// Remove the screenshot button element
	screenshotButton.remove();
	eventManager.removeEventListeners("screenshotButton");
}
function makeMaximizeSVG(): SVGElement {
	const maximizeSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	maximizeSVG.setAttributeNS(null, "stroke", "currentColor");
	maximizeSVG.setAttributeNS(null, "height", "100%");
	maximizeSVG.setAttributeNS(null, "width", "100%");
	maximizeSVG.setAttributeNS(null, "fill", "none");
	maximizeSVG.setAttributeNS(null, "stroke-width", "1.5");
	maximizeSVG.setAttributeNS(null, "viewBox", "0 0 36 36");
	const maximize_SVG_FirstPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	maximize_SVG_FirstPath.setAttributeNS(
		null,
		"d",
		"M 26.171872,26.171876 H 9.8281282 V 9.8281241 H 26.171872 Z m -16.3437437,0 V 9.8281241 H 26.171872 V 26.171876 Z"
	);
	maximize_SVG_FirstPath.setAttributeNS(null, "stroke-linecap", "round");
	maximize_SVG_FirstPath.setAttributeNS(null, "stroke-linejoin", "round");
	maximize_SVG_FirstPath.style.strokeWidth = "1.5";
	maximize_SVG_FirstPath.style.strokeLinejoin = "round";
	const maximize_SVG_SecondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	maximize_SVG_SecondPath.setAttributeNS(null, "d", "m 18,14.497768 v 7.004464 M 21.502231,18 h -7.004462");
	maximize_SVG_SecondPath.setAttributeNS(null, "stroke-linecap", "round");
	maximize_SVG_SecondPath.setAttributeNS(null, "stroke-linejoin", "round");
	maximize_SVG_SecondPath.style.strokeWidth = "1.5";
	maximize_SVG_SecondPath.style.strokeLinejoin = "round";
	maximizeSVG.appendChild(maximize_SVG_FirstPath);
	maximizeSVG.appendChild(maximize_SVG_SecondPath);
	return maximizeSVG;
}
function makeMinimizeSVG(): SVGElement {
	const minimizeSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	minimizeSVG.setAttributeNS(null, "stroke", "currentColor");
	minimizeSVG.setAttributeNS(null, "height", "100%");
	minimizeSVG.setAttributeNS(null, "width", "100%");
	minimizeSVG.setAttributeNS(null, "fill", "none");
	minimizeSVG.setAttributeNS(null, "stroke-width", "1.5");
	minimizeSVG.setAttributeNS(null, "viewBox", "0 0 36 36");
	const minimize_SVG_FirstPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	minimize_SVG_FirstPath.setAttributeNS(
		null,
		"d",
		"M 26.171872,26.171876 H 9.8281282 V 9.8281241 H 26.171872 Z m -16.3437437,0 V 9.8281241 H 26.171872 V 26.171876 Z"
	);
	minimize_SVG_FirstPath.setAttributeNS(null, "stroke-linecap", "round");
	minimize_SVG_FirstPath.setAttributeNS(null, "stroke-linejoin", "round");
	minimize_SVG_FirstPath.style.strokeWidth = "1.5";
	minimize_SVG_FirstPath.style.strokeLinejoin = "round";
	const minimize_SVG_SecondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	minimize_SVG_SecondPath.setAttributeNS(null, "d", "M 21.502231,18 H 14.497769");
	minimize_SVG_SecondPath.setAttributeNS(null, "stroke-linecap", "round");
	minimize_SVG_SecondPath.setAttributeNS(null, "stroke-linejoin", "round");
	minimize_SVG_SecondPath.style.strokeWidth = "1.5";
	minimize_SVG_SecondPath.style.strokeLinejoin = "round";
	minimizeSVG.appendChild(minimize_SVG_FirstPath);
	minimizeSVG.appendChild(minimize_SVG_SecondPath);
	return minimizeSVG;
}
function maximizePlayer(maximizePlayerButton: HTMLButtonElement) {
	// Get the video element
	const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
	// If video element is not available, return
	if (!videoElement) return;
	const videoContainer = document.querySelector("#movie_player") as YouTubePlayerDiv | null;
	if (!videoContainer) return;
	const controlsElement = document.querySelector("div.ytp-chrome-bottom") as HTMLDivElement | null;
	if (!controlsElement) return;
	const sizeElement = document.querySelector("button.ytp-button.ytp-size-button") as HTMLButtonElement | null;
	if (!sizeElement) return;
	const {
		childNodes: [svgElement]
	} = sizeElement;
	if (!svgElement || !(svgElement instanceof SVGElement)) return;
	const theaterModeVariables = {
		pathD: "m 28,11 0,14 -20,0 0,-14 z m -18,2 16,0 0,10 -16,0 0,-10 z",
		dataTitleNoTooltip: "Theater mode",
		ariaLabel: "Theater mode keyboard shortcut t",
		title: "Theater mode (t)"
	};
	const defaultModeVariables = {
		pathD: "m 26,13 0,10 -16,0 0,-10 z m -14,2 12,0 0,6 -12,0 0,-6 z",
		dataTitleNoTooltip: "Default view",
		ariaLabel: "Default view keyboard shortcut t",
		title: "Default view (t)"
	};
	const {
		childNodes: [, svgPath]
	} = svgElement;
	if (!svgPath || !(svgPath instanceof SVGPathElement)) return;
	if (svgPath.getAttribute("d") === theaterModeVariables.pathD) wasInTheatreMode = true;
	else wasInTheatreMode = false;
	if (wasInTheatreMode) setToTheatreMode = false;
	else setToTheatreMode = true;
	// TODO: finish this code to make the maximize player button work properly. (implement ytp-scrubber-container adjustment) if all else fails revert to using the theatre mode button to get the tooltips in the correct place
	console.log(`setToTheatreMode && wasInTheatreMode: ${setToTheatreMode && wasInTheatreMode}`);
	console.log(`setToTheatreMode && !wasInTheatreMode: ${setToTheatreMode && !wasInTheatreMode}`);
	console.log(`!setToTheatreMode && wasInTheatreMode: ${!setToTheatreMode && wasInTheatreMode}`);
	console.log(`!setToTheatreMode && !wasInTheatreMode: ${!setToTheatreMode && !wasInTheatreMode}`);
	if (
		videoContainer.classList.contains("maximized_video_container") &&
		videoElement.classList.contains("maximized_video") &&
		controlsElement.classList.contains("maximized_controls")
	) {
		// sizeElement.click();
		// if (setToTheatreMode && wasInTheatreMode) {
		// 	const { dataTitleNoTooltip, title, ariaLabel, pathD } = defaultModeVariables;
		// 	svgPath.setAttributeNS(null, "d", pathD);
		// 	sizeElement.setAttributeNS(null, "aria-label", ariaLabel);
		// 	sizeElement.dataset.titleNoTooltip = dataTitleNoTooltip;
		// 	sizeElement.title = title;
		// } else if (setToTheatreMode && !wasInTheatreMode) {
		// 	const { dataTitleNoTooltip, title, ariaLabel, pathD } = theaterModeVariables;
		// 	svgPath.setAttributeNS(null, "d", pathD);
		// 	sizeElement.setAttributeNS(null, "aria-label", ariaLabel);
		// 	sizeElement.dataset.titleNoTooltip = dataTitleNoTooltip;
		// 	sizeElement.title = title;
		// }

		maximizePlayerButton.dataset.title = "Maximize Player";
		videoElement.classList.remove("maximized_video");
		videoContainer.classList.remove("maximized_video_container");
		controlsElement.classList.remove("maximized_controls");
		maximizePlayerButton.removeChild(maximizePlayerButton.firstChild as Node);
		maximizePlayerButton.appendChild(makeMaximizeSVG());
	} else {
		// sizeElement.click();

		// if (!setToTheatreMode && wasInTheatreMode) {
		// 	const { dataTitleNoTooltip, title, ariaLabel, pathD } = defaultModeVariables;
		// 	svgPath.setAttributeNS(null, "d", pathD);
		// 	sizeElement.setAttributeNS(null, "aria-label", ariaLabel);
		// 	sizeElement.dataset.titleNoTooltip = dataTitleNoTooltip;
		// 	sizeElement.title = title;
		// } else if (setToTheatreMode && !wasInTheatreMode) {
		// 	const { dataTitleNoTooltip, title, ariaLabel, pathD } = theaterModeVariables;
		// 	svgPath.setAttributeNS(null, "d", pathD);
		// 	sizeElement.setAttributeNS(null, "aria-label", ariaLabel);
		// 	sizeElement.dataset.titleNoTooltip = dataTitleNoTooltip;
		// 	sizeElement.title = title;
		// }

		maximizePlayerButton.dataset.title = "Minimize Player";
		videoElement.classList.add("maximized_video");
		videoContainer.classList.add("maximized_video_container");
		controlsElement.classList.add("maximized_controls");
		maximizePlayerButton.removeChild(maximizePlayerButton.firstChild as Node);
		maximizePlayerButton.appendChild(makeMinimizeSVG());
	}
}

// TODO: Add event listener that updates scrubber position when maximize button is clicked
function updateProgressBarPositions() {
	const seekBar = document.querySelector("div.ytp-progress-bar") as HTMLDivElement | null;
	const scrubber = document.querySelector("div.ytp-scrubber-container") as HTMLDivElement | null;
	const hoverProgress = document.querySelector("div.ytp-hover-progress") as HTMLDivElement | null;
	if (!seekBar) return;
	if (!scrubber) return;
	if (!hoverProgress) return;
	const elapsedTime = parseInt(seekBar?.ariaValueNow ?? "0") ?? 0;
	const duration = parseInt(seekBar?.ariaValueMax ?? "0") ?? 0;
	const seekBarWidth = seekBar?.clientWidth ?? 0;

	const scrubberPosition = parseFloat(Math.min((elapsedTime / duration) * seekBarWidth, seekBarWidth).toFixed(3));
	// TODO: get this working when video is playing
	scrubber.style.transform = `translateX(${scrubberPosition}px)`;
	// TODO: get all progress bar lists updated when video is playing
	hoverProgress.style.left = `${scrubberPosition}px`;
}
function setupVideoPlayerTimeUpdate() {
	const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
	if (!videoElement) return;
	const videoPlayerTimeUpdateListener = () => {
		updateProgressBarPositions();
	};
	eventManager.addEventListener(videoElement, "timeupdate", videoPlayerTimeUpdateListener, "maximizePlayerButton");
}
async function addMaximizePlayerButton(): Promise<void> {
	// Wait for the "options" message from the content script
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });

	// If options are not available, return
	if (!options) return;

	// Extract the necessary properties from the options object
	const { enable_maximize_player_button: enableMaximizePlayerButton } = options;
	// If the maximize player button option is disabled, return
	if (!enableMaximizePlayerButton) return;
	const maximizePlayerButtonExists = document.querySelector("button.yte-maximize-player-button") as HTMLButtonElement | null;
	// If maximize player button already exists, return
	if (maximizePlayerButtonExists) return;
	// Get the volume control element
	const sizeButton = document.querySelector(
		"div.ytp-chrome-controls > div.ytp-right-controls > button.ytp-button.ytp-size-button"
	) as HTMLButtonElement | null;
	// If volume control element is not available, return
	if (!sizeButton) return;
	// Create the maximize player button element
	const maximizePlayerButton = document.createElement("button");
	maximizePlayerButton.classList.add("ytp-button");
	maximizePlayerButton.classList.add("yte-maximize-player-button");
	maximizePlayerButton.dataset.title = "Maximize Player";
	const maximizeSVG = makeMaximizeSVG();
	maximizePlayerButton.appendChild(maximizeSVG);
	// Add a click event listener to the maximize button
	async function maximizePlayerButtonClickListener() {
		maximizePlayer(maximizePlayerButton);
		updateProgressBarPositions();
		setupVideoPlayerTimeUpdate();
	}
	function maximizePlayerButtonMouseOverListener() {
		// Create tooltip element
		const tooltip = document.createElement("div");
		const rect = maximizePlayerButton.getBoundingClientRect();
		tooltip.classList.add("yte-button-tooltip");
		tooltip.classList.add("ytp-tooltip");
		tooltip.classList.add("ytp-rounded-tooltip");
		tooltip.classList.add("ytp-bottom");
		tooltip.id = "yte-maximize-button-tooltip";
		tooltip.style.left = `${rect.left + rect.width / 2}px`;
		tooltip.style.top = `${rect.top - 2}px`;
		tooltip.style.zIndex = "2021";
		const {
			dataset: { title }
		} = maximizePlayerButton;
		tooltip.textContent = title ?? "Maximize Player";
		function mouseLeaveListener() {
			tooltip.remove();
			eventManager.addEventListener(maximizePlayerButton, "mouseleave", mouseLeaveListener, "maximizePlayerButton");
		}
		eventManager.addEventListener(maximizePlayerButton, "mouseleave", mouseLeaveListener, "maximizePlayerButton");
		document.body.appendChild(tooltip);
	}
	// Append the maximize player button to before the volume control element
	sizeButton.before(maximizePlayerButton);
	eventManager.addEventListener(maximizePlayerButton, "click", maximizePlayerButtonClickListener, "maximizePlayerButton");
	eventManager.addEventListener(maximizePlayerButton, "mouseover", maximizePlayerButtonMouseOverListener, "maximizePlayerButton");
	const pipElement: HTMLButtonElement | null = document.querySelector("button.ytp-pip-button");
	const sizeElement: HTMLButtonElement | null = document.querySelector("button.ytp-size-button");
	const miniPlayerElement: HTMLButtonElement | null = document.querySelector("button.ytp-miniplayer-button");
	function otherElementClickListener() {
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
	function ytpLeftButtonMouseEnterListener(event: MouseEvent) {
		const tooltip = document.querySelector("#movie_player > div.ytp-tooltip") as HTMLDivElement | null;
		if (!tooltip) return;
		// Get the video element
		const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
		// If video element is not available, return
		if (!videoElement) return;
		const videoContainer = document.querySelector("#movie_player") as YouTubePlayerDiv | null;
		if (!videoContainer) return;
		const controlsElement = document.querySelector("div.ytp-chrome-bottom") as HTMLDivElement | null;
		if (!controlsElement) return;

		if (
			videoContainer.classList.contains("maximized_video_container") &&
			videoElement.classList.contains("maximized_video") &&
			controlsElement.classList.contains("maximized_controls")
		) {
			const buttonRect = (event.target as HTMLButtonElement).getBoundingClientRect();
			const tooltipRect = tooltip.getBoundingClientRect();
			tooltip.style.top = `${buttonRect.top - tooltipRect.height - 14}px`;
			tooltip.style.zIndex = "2021";
		}
	}
	function ytpRightButtonMouseEnterListener(event: MouseEvent) {
		const tooltip = document.querySelector("#movie_player > div.ytp-tooltip") as HTMLDivElement | null;
		if (!tooltip) return;
		// Get the video element
		const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
		// If video element is not available, return
		if (!videoElement) return;
		const videoContainer = document.querySelector("#movie_player") as YouTubePlayerDiv | null;
		if (!videoContainer) return;
		const controlsElement = document.querySelector("div.ytp-chrome-bottom") as HTMLDivElement | null;
		if (!controlsElement) return;

		if (
			videoContainer.classList.contains("maximized_video_container") &&
			videoElement.classList.contains("maximized_video") &&
			controlsElement.classList.contains("maximized_controls")
		) {
			const buttonRect = (event.target as HTMLButtonElement).getBoundingClientRect();
			const tooltipRect = tooltip.getBoundingClientRect();
			tooltip.style.left = `${buttonRect.left - 48}px`;
			tooltip.style.top = `${buttonRect.top - tooltipRect.height - 14}px`;
			tooltip.style.zIndex = "2021";
		}
	}
	function seekBarMouseEnterListener(event: MouseEvent) {
		// TODO: get the seek preview to be in the correct place when the video is maximized
		const tooltip = document.querySelector("#movie_player > div.ytp-tooltip") as HTMLDivElement | null;
		if (!tooltip) return;
		// Get the video element
		const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
		// If video element is not available, return
		if (!videoElement) return;
		const videoContainer = document.querySelector("#movie_player") as YouTubePlayerDiv | null;
		if (!videoContainer) return;
		const controlsElement = document.querySelector("div.ytp-chrome-bottom") as HTMLDivElement | null;
		if (!controlsElement) return;

		if (
			videoContainer.classList.contains("maximized_video_container") &&
			videoElement.classList.contains("maximized_video") &&
			controlsElement.classList.contains("maximized_controls")
		) {
			const buttonRect = (event.target as HTMLButtonElement).getBoundingClientRect();
			const tooltipRect = tooltip.getBoundingClientRect();
			tooltip.style.top = `${buttonRect.top - tooltipRect.height - 14}px`;
			tooltip.style.zIndex = "2021";
		}
	}

	if (pipElement) {
		eventManager.addEventListener(pipElement, "click", otherElementClickListener, "maximizePlayerButton");
	}
	if (sizeElement) {
		eventManager.addEventListener(sizeElement, "click", otherElementClickListener, "maximizePlayerButton");
	}
	if (miniPlayerElement) {
		eventManager.addEventListener(miniPlayerElement, "click", otherElementClickListener, "maximizePlayerButton");
	}
	const typLeftButtons = [
		...(document.querySelectorAll(
			"div.ytp-chrome-controls > div.ytp-left-controls > :not(.yte-maximized-player-button)"
		) as NodeListOf<HTMLButtonElement>)
	];
	const volumePanel = document.querySelector("div.ytp-chrome-controls > div.ytp-left-controls > span > div") as HTMLButtonElement | null;
	const seekBarContainer = document.querySelector("div.ytp-chrome-bottom > div.ytp-progress-bar") as HTMLDivElement | null;
	if (!seekBarContainer) return;
	if (volumePanel) typLeftButtons.push(volumePanel);
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore TODO: figure out the proper type for this
	eventManager.addEventListener(seekBarContainer, "mouseenter", seekBarMouseEnterListener, "maximizePlayerButton");

	const typRightButtons = document.querySelectorAll(
		"div.ytp-chrome-controls > div.ytp-right-controls > :not(.yte-maximized-player-button)"
	) as NodeListOf<HTMLButtonElement>;
	typLeftButtons.forEach((button) => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore TODO: figure out the proper type for this
		eventManager.addEventListener(button, "mouseenter", ytpLeftButtonMouseEnterListener, "maximizePlayerButton");
	});
	typRightButtons.forEach((button) => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore TODO: figure out the proper type for this
		eventManager.addEventListener(button, "mouseenter", ytpRightButtonMouseEnterListener, "maximizePlayerButton");
	});
}
async function removeMaximizePlayerButton(): Promise<void> {
	// Try to get the existing maximize player button element
	const maximizePlayerButton = document.querySelector("button.yte-maximize-player-button") as HTMLButtonElement | null;
	// If maximize player button is not available, return
	if (!maximizePlayerButton) return;
	// Remove the maximize player button element
	maximizePlayerButton.remove();
	eventManager.removeEventListeners("maximizePlayerButton");
}
/**
 * Sets the remembered volume based on the options received from a specific message.
 * It restores the last volume if the option is enabled.
 *
 * @returns {Promise<void>} A promise that resolves once the remembered volume is set.
 */
async function setRememberedVolume(): Promise<void> {
	// Wait for the "options" message from the content script
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });

	// If options are not available, return
	if (!options) return;

	// Extract the necessary properties from the options object
	const { remembered_volume: rememberedVolume, enable_remember_last_volume: enableRememberVolume } = options;

	// Get the player container element
	const playerContainer = isWatchPage()
		? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
		: isShortsPage()
		? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
		: null;

	// If player container is not available, return
	if (!playerContainer) return;

	// If setVolume method is not available in the player container, return
	if (!playerContainer.setVolume) return;

	// Log the message indicating whether the last volume is being restored or not
	browserColorLog(`${enableRememberVolume ? "Restoring" : "Not restoring"} last volume ${rememberedVolume}`, "FgMagenta");

	// If the remembered volume option is enabled, set the volume and draw the volume display
	if (rememberedVolume && enableRememberVolume) {
		await playerContainer.setVolume(rememberedVolume);
	}
}

/**
 * Sets the player quality based on the options received from a specific message.
 * It automatically sets the quality if the option is enabled and the specified quality is available.
 *
 * @returns {Promise<void>} A promise that resolves once the player quality is set.
 */
async function setPlayerQuality(): Promise<void> {
	// Wait for the "options" message from the content script
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });

	// If options are not available, return
	if (!options) return;

	// Extract the necessary properties from the options object
	const { player_quality, enable_automatically_set_quality } = options;

	// If automatically set quality option is disabled, return
	if (!enable_automatically_set_quality) return;

	// If player quality is not specified, return
	if (!player_quality) return;

	// Initialize the playerQuality variable
	let playerQuality: YoutubePlayerQualityLabel | YoutubePlayerQualityLevel = player_quality;

	// Get the player element
	const playerContainer = isWatchPage()
		? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
		: isShortsPage()
		? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
		: null;

	// If player element is not available, return
	if (!playerContainer) return;

	// If setPlaybackQuality method is not available in the player, return
	if (!playerContainer.setPlaybackQuality) return;

	// Get the available quality levels
	const availableQualityLevels = (await playerContainer.getAvailableQualityLevels()) as YoutubePlayerQualityLevel[];

	// Check if the specified player quality is available
	if (playerQuality && playerQuality !== "auto") {
		if (!availableQualityLevels.includes(playerQuality)) {
			// Convert the available quality levels to their corresponding labels
			const availableResolutions = availableQualityLevels.reduce(function (array, elem) {
				if (YoutubePlayerQualityLabels[YoutubePlayerQualityLevels.indexOf(elem)]) {
					array.push(YoutubePlayerQualityLabels[YoutubePlayerQualityLevels.indexOf(elem)]);
				}
				return array;
			}, [] as YoutubePlayerQualityLabel[]);

			// Choose the closest quality level based on the available resolutions
			playerQuality = chooseClosetQuality(YoutubePlayerQualityLabels[YoutubePlayerQualityLevels.indexOf(playerQuality)], availableResolutions);

			// If the chosen quality level is not available, return
			if (!YoutubePlayerQualityLevels.at(YoutubePlayerQualityLabels.indexOf(playerQuality))) return;

			// Update the playerQuality variable
			playerQuality = YoutubePlayerQualityLevels.at(YoutubePlayerQualityLabels.indexOf(playerQuality)) as YoutubePlayerQualityLevel;
		}

		// Log the message indicating the player quality being set
		browserColorLog(`Setting player quality to ${playerQuality}`, "FgMagenta");

		// Set the playback quality and update the default quality in the dataset
		playerContainer.setPlaybackQualityRange(playerQuality);
		playerContainer.dataset.defaultQuality = playerQuality;
	}
}

/**
 * Sets the player speed based on the options received from a specific message.
 * It sets the playback speed if the option is enabled and a valid speed is specified.
 *
 * @returns {Promise<void>} A promise that resolves once the player speed is set.
 */
async function setPlayerSpeed(options?: { playerSpeed?: number; enableForcedPlaybackSpeed?: boolean }): Promise<void> {
	if (options) {
		const { enableForcedPlaybackSpeed, playerSpeed } = options;
		if (!enableForcedPlaybackSpeed) return;
		if (!playerSpeed) return;
		// Get the player element
		const playerContainer = isWatchPage()
			? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
			: isShortsPage()
			? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
			: null;
		const video = document.querySelector("video.html5-main-video") as HTMLVideoElement | null;
		// If player element is not available, return
		if (!playerContainer) return;

		// If setPlaybackRate method is not available in the player, return
		if (!playerContainer.setPlaybackRate) return;

		// Log the message indicating the player speed being set
		browserColorLog(`Setting player speed to ${playerSpeed}`, "FgMagenta");

		// Set the playback speed
		playerContainer.setPlaybackRate(playerSpeed);
		// Set the video playback speed
		if (video) video.playbackRate = playerSpeed;
	} else {
		// Wait for the "options" message from the content script
		const { options } = await waitForSpecificMessage("options", { source: "content_script" });

		// If options are not available, return
		if (!options) return;

		// Extract the necessary properties from the options object
		const { player_speed, enable_forced_playback_speed } = options;

		// If forced playback speed option is disabled, return
		if (!enable_forced_playback_speed) return;

		// If player speed is not specified, return
		if (!player_speed) return;

		// Get the player element
		const playerContainer = isWatchPage()
			? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
			: isShortsPage()
			? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
			: null;
		// If player element is not available, return
		if (!playerContainer) return;
		const video = document.querySelector("video.html5-main-video") as HTMLVideoElement | null;

		// If setPlaybackRate method is not available in the player, return
		if (!playerContainer.setPlaybackRate) return;

		// Log the message indicating the player speed being set
		browserColorLog(`Setting player speed to ${player_speed}`, "FgMagenta");

		// Set the playback speed
		playerContainer.setPlaybackRate(player_speed);
		// Set the video playback speed
		if (video) video.playbackRate = player_speed;
	}
}
/**
 * Adjusts the volume on scroll wheel events.
 * It listens for scroll wheel events on specified container selectors,
 * adjusts the volume based on the scroll direction and options,
 * and updates the volume display.
 *
 * @returns {Promise<void>} A promise that resolves once the volume adjustment is completed.
 */
async function adjustVolumeOnScrollWheel(): Promise<void> {
	// Wait for the specified container selectors to be available on the page
	const containerSelectors = await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);

	// Define the event handler for the scroll wheel events
	const handleWheel = async (event: Event) => {
		const wheelEvent = event as WheelEvent | undefined;

		// If it's not a wheel event, return
		if (!wheelEvent) return;
		// Get the player element
		const playerContainer = isWatchPage()
			? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
			: isShortsPage()
			? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
			: null;
		// If player element is not available, return
		if (!playerContainer) return;

		// Adjust the volume based on the scroll direction
		const scrollDelta = getScrollDirection(wheelEvent.deltaY);

		// Wait for the "options" message from the extension
		const { options } = await waitForSpecificMessage("options", { source: "content_script" });

		// If options are not available, return
		if (!options) return;

		// If scroll wheel volume control is disabled, return
		if (!options.enable_scroll_wheel_volume_control) return;

		// Adjust the volume based on the scroll direction and options
		const { newVolume } = await adjustVolume(scrollDelta, options.volume_adjustment_steps);

		// Update the volume display
		drawVolumeDisplay({
			displayType: options.osd_display_type,
			displayPosition: options.osd_display_position,
			displayColor: options.osd_display_color,
			displayOpacity: options.osd_display_opacity,
			playerContainer: playerContainer || null,
			displayPadding: options.osd_display_padding,
			displayHideTime: options.osd_display_hide_time,
			volume: newVolume
		});

		// Send a "setVolume" message to the content script
		sendMessage("setVolume", { volume: newVolume, source: "content_script" });
	};

	// Set up the scroll wheel event listeners on the specified container selectors
	for (const selector of containerSelectors) {
		setupListeners(selector, handleWheel);
	}
}
async function volumeBoost() {
	// Wait for the "options" message from the extension
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });

	// If options are not available, return
	if (!options) return;
	const { volume_boost_amount, enable_volume_boost } = options;
	// If volume boost option is disabled, return
	if (!enable_volume_boost) return;

	// Get the player element
	const player = document.querySelector("video") as YouTubePlayerDiv | null;
	// If player element is not available, return
	if (!player) return;

	// Log the message indicating the volume boost being enabled
	browserColorLog(`Enabling volume boost`, "FgMagenta");

	if (window.audioCtx && window.gainNode) {
		browserColorLog(`Setting volume boost to ${Math.pow(10, volume_boost_amount / 20)}`, "FgMagenta");
		window.gainNode.gain.value = Math.pow(10, volume_boost_amount / 20);
	} else {
		window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		const source = window.audioCtx.createMediaElementSource(player as unknown as HTMLMediaElement);
		const gainNode = window.audioCtx.createGain();
		source.connect(gainNode);
		gainNode.connect(window.audioCtx.destination);
		window.gainNode = gainNode;
		browserColorLog(`Setting volume boost to ${Math.pow(10, volume_boost_amount / 20)}`, "FgMagenta");
		gainNode.gain.value = Math.pow(10, volume_boost_amount / 20);
	}
}
// #endregion Main functions
// #region Intercommunication functions
/**
 * Wait for a specific message of the given event type and return the message data.
 *
 * @param {T} eventType - The type of the event to wait for.
 * @param {Omit<MessageData<T>, "type">} data - The data to send along with the message.
 * @returns {Promise<MessageData<T>>} A promise that resolves to the received message data.
 */
function waitForSpecificMessage<T extends MessageTypes>(eventType: T, data: Omit<MessageData<T>, "type">): Promise<MessageData<T>> {
	return new Promise((resolve) => {
		/**
		 * Handles the received message and resolves the promise if it matches the expected event type.
		 */
		function handleMessage() {
			const provider = document.querySelector("#yte-message-from-extension");
			if (!provider) return;
			const { textContent: stringifiedMessage } = provider;
			if (!stringifiedMessage) return;
			let message;
			try {
				message = JSON.parse(stringifiedMessage) as MessageData<T>;
			} catch (error) {
				console.error(error);
				return;
			}
			if (!message) return;
			if (message.type && message.type === eventType) {
				document.removeEventListener("yte-message-from-extension", handleMessage);
				resolve(message as MessageData<T>);
			}
		}

		// Add event listener to listen for the specific message
		document.addEventListener("yte-message-from-extension", handleMessage);

		// Send the message
		sendMessage(eventType, data);
	});
}

/**
 * Send a message to the extension.
 *
 * @template T - The type of the message event.
 * @param {T} eventType - The type of the message event.
 * @param {Omit<MessageData<T>, "type">} data - The data to be included in the message.
 */
function sendMessage<T extends MessageTypes>(eventType: T, data: Omit<MessageData<T>, "type">) {
	// Create the message object
	const message: Omit<MessageData<typeof eventType>, "type"> = {
		type: eventType,
		source: "extension",
		...data
	};

	// Convert the message object to a string
	const stringifiedMessage = JSON.stringify(message);

	// Set the text content of an element (e.g., a hidden div) with the stringified message
	element.textContent = stringifiedMessage;

	// Dispatch a custom event to notify the extension about the message
	document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
}
// #endregion Intercommunication functions
window.onload = function () {
	addScreenshotButton();
	addMaximizePlayerButton();
	setRememberedVolume();
	setPlayerQuality();
	setPlayerSpeed();
	volumeBoost();
	adjustVolumeOnScrollWheel();
	setupVideoHistory();
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
	document.addEventListener("yt-navigate-finish", enableFeatures);
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
			message = JSON.parse(stringifiedMessage) as MessageData<MessageTypes>;
		} catch (error) {
			console.error(error);
			return;
		}
		if (!message) return;
		if (
			!(
				["volumeBoostChange", "playerSpeedChange", "screenshotButtonChange", "maximizePlayerButtonChange", "videoHistoryChange"] as MessageTypes[]
			).includes(message.type)
		)
			return;
		message = message as MessageData<
			"volumeBoostChange" | "playerSpeedChange" | "screenshotButtonChange" | "maximizePlayerButtonChange" | "videoHistoryChange"
		>;
		switch (message.type) {
			case "volumeBoostChange": {
				const { volumeBoostAmount, volumeBoostEnabled } = message;
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
				const { playerSpeed, enableForcedPlaybackSpeed } = message;
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
				const { screenshotButtonEnabled } = message;
				if (screenshotButtonEnabled) {
					addScreenshotButton();
				} else {
					removeScreenshotButton();
				}
				break;
			}
			case "maximizePlayerButtonChange": {
				const { maximizePlayerButtonEnabled } = message;
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
				const { videoHistoryEnabled } = message;
				if (videoHistoryEnabled) {
					setupVideoHistory();
				} else {
					eventManager.removeEventListeners("videoHistory");
				}
				break;
			}
		}
	});
};
window.onbeforeunload = function () {
	eventManager.removeAllEventListeners();
	element.remove();
};
/**
 * Wait for all elements to appear in the document.
 *
 * @param selectors - Array of CSS selectors for the elements to wait for.
 * @returns Promise that resolves with an array of the matching elements.
 */
function waitForAllElements(selectors: Selector[]): Promise<Selector[]> {
	return new Promise((resolve) => {
		setTimeout(() => {
			browserColorLog("Waiting for target nodes", "FgMagenta");
			const elementsMap = new Map<string, Element | null>();
			const { length: selectorsCount } = selectors;
			let resolvedCount = 0;

			const observer = new MutationObserver(() => {
				selectors.forEach((selector) => {
					const element = document.querySelector(selector);
					elementsMap.set(selector, element);
					if (!element) {
						return;
					}

					resolvedCount++;
					if (resolvedCount === selectorsCount) {
						observer.disconnect();
						const resolvedElements = selectors.map((selector) => (elementsMap.get(selector) ? selector : undefined)).filter(Boolean);
						resolve(resolvedElements);
					}
				});
			});

			observer.observe(document, { childList: true, subtree: true });

			selectors.forEach((selector) => {
				const element = document.querySelector(selector);
				elementsMap.set(selector, element);
				if (!element) {
					return;
				}

				resolvedCount++;
				if (resolvedCount === selectorsCount) {
					observer.disconnect();
					const resolvedElements = selectors.map((selector) => (elementsMap.get(selector) ? selector : undefined)).filter(Boolean);
					resolve(resolvedElements);
				}
			});
		}, 2_500);
	});
}
// #region Listener functions
/**
 * Set up event listeners for the specified element.
 *
 * @param selector - The CSS selector for the element.
 * @param listener - The event listener function.
 */
function setupListeners(selector: Selector, handleWheel: (event: Event) => void) {
	const elements: NodeListOf<HTMLDivElement> = document.querySelectorAll(selector);
	if (!elements.length) return browserColorLog(`No elements found with selector ${selector}`, "FgRed");
	for (const element of elements) {
		const mouseWheelListener = (e: Event) => {
			if (element.clientHeight === 0) return;
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			handleWheel(e);
		};
		eventManager.addEventListener(element, "wheel", mouseWheelListener, "scrollWheelVolumeControl");
	}
}
// #endregion Listener functions
// #region Volume utility functions
/**
 * Get the scroll direction based on the deltaY value.
 *
 * @param deltaY - The deltaY value from the scroll event.
 * @returns The scroll direction: 1 for scrolling up, -1 for scrolling down.
 */
function getScrollDirection(deltaY: number): number {
	return deltaY < 0 ? 1 : -1;
}
/**
 * Adjust the volume based on the scroll direction.
 *
 * @param scrollDelta - The scroll direction.
 * @param adjustmentSteps - The volume adjustment steps.
 * @returns Promise that resolves with the new volume.
 */
function adjustVolume(scrollDelta: number, volumeStep: number): Promise<{ newVolume: number; oldVolume: number }> {
	return new Promise((resolve) => {
		(async () => {
			const playerContainer = isWatchPage()
				? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
				: isShortsPage()
				? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
				: null;
			if (!playerContainer) return;
			if (!playerContainer.getVolume) return;
			if (!playerContainer.setVolume) return;
			if (!playerContainer.isMuted) return;
			if (!playerContainer.unMute) return;
			const [volume, isMuted] = await Promise.all([playerContainer.getVolume(), playerContainer.isMuted()]);
			const newVolume = clamp(toDivisible(volume + scrollDelta * volumeStep, volumeStep), 0, 100);
			browserColorLog(`Adjusting volume by ${volumeStep} to ${newVolume}. Old volume was ${volume}`, "FgMagenta");
			await playerContainer.setVolume(newVolume);
			if (isMuted) {
				if (typeof playerContainer.unMute === "function") await playerContainer.unMute();
			}
			resolve({ newVolume, oldVolume: volume });
		})();
	});
}
/**
 * Draw the volume display over the player.
 *
 * @param options - The options for the volume display.
 */
function drawVolumeDisplay({
	displayType,
	displayPosition,
	displayColor,
	displayOpacity,
	displayPadding,
	displayHideTime,
	playerContainer,
	volume
}: {
	volume: number;
	displayType: OnScreenDisplayType;
	displayPosition: OnScreenDisplayPosition;
	displayColor: OnScreenDisplayColor;
	displayOpacity: number;
	displayPadding: number;
	displayHideTime: number;
	playerContainer: YouTubePlayerDiv | null;
}) {
	volume = clamp(volume, 0, 100);
	const canvas = document.createElement("canvas");
	canvas.id = "volume-display";
	const context = canvas.getContext("2d");

	if (!context) {
		browserColorLog("Canvas not supported", "FgRed");
		return;
	}

	// Set canvas dimensions based on player/container dimensions
	if (!playerContainer) {
		browserColorLog("Player container not found", "FgRed");
		return;
	}
	if (displayType === "no_display") return;
	let { clientWidth: width, clientHeight: height } = playerContainer;
	const originalWidth = width;
	const originalHeight = height;
	// Adjust canvas dimensions for different display positions
	switch (displayPosition) {
		case "top_left":
		case "top_right":
		case "bottom_left":
		case "bottom_right":
			width /= 4;
			height /= 4;
			break;
		case "center":
			width /= 2;
			height /= 2;
			break;
		default:
			console.error("Invalid display position");
			return;
	}
	if (displayPadding > Math.max(width, height)) {
		// Clamp displayPadding to max width and height
		displayPadding = clamp(displayPadding, 0, Math.max(width, height));
		browserColorLog(`Clamped display padding to ${displayPadding}`, "FgRed");
	}

	// Set canvas styles for positioning
	canvas.style.position = "absolute";
	switch (displayPosition) {
		case "top_left":
			canvas.style.top = `${displayPadding}px`;
			canvas.style.left = `${displayPadding}px`;
			break;
		case "top_right":
			canvas.style.top = `${displayPadding}px`;
			canvas.style.right = `${displayPadding}px`;
			break;
		case "bottom_left":
			canvas.style.bottom = `${displayPadding}px`;
			canvas.style.left = `${displayPadding}px`;
			break;
		case "bottom_right":
			canvas.style.bottom = `${displayPadding}px`;
			canvas.style.right = `${displayPadding}px`;
			break;
		case "center":
			canvas.style.top = "50%";
			canvas.style.left = "50%";
			canvas.style.transform = "translate(-50%, -50%)";
			break;
		default:
			console.error("Invalid display position");
			return;
	}
	switch (displayType) {
		case "text": {
			const fontSize = Math.min(originalWidth, originalHeight) / 10;
			context.font = `${clamp(fontSize, 48, 72)}px bold Arial`;
			const { width: textWidth } = context.measureText(`${round(volume)}`);
			width = textWidth;
			height = fontSize;
			break;
		}
		case "line": {
			const maxLineWidth = 100; // Maximum width of the volume line
			const lineHeight = 5; // Height of the volume line
			const lineWidth = Math.round(round(volume / 100, 2) * maxLineWidth);
			width = lineWidth;
			height = lineHeight;
			break;
		}
		case "round": {
			const lineWidth = 5;
			const radius = Math.min(width, height, 75) / 2 - lineWidth; // Maximum radius based on canvas dimensions
			const circleWidth = radius * 2 + lineWidth * 2;
			width = circleWidth;
			height = circleWidth;
			break;
		}
		default:
			console.error("Invalid display type");
			return;
	}

	// Apply content dimensions to the canvas
	canvas.width = width;
	canvas.height = height;
	canvas.style.zIndex = "2021";
	canvas.style.pointerEvents = "none";

	// Clear canvas
	context.clearRect(0, 0, width, height);
	context.fillStyle = displayColor;
	context.globalAlpha = displayOpacity / 100;
	// Draw volume representation based on display type
	switch (displayType) {
		case "text": {
			const fontSize = Math.min(originalWidth, originalHeight) / 10;
			context.font = `${clamp(fontSize, 48, 72)}px bold Arial`;
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillText(`${round(volume)}`, width / 2, height / 2);
			break;
		}
		case "line": {
			const maxLineWidth = 100; // Maximum width of the volume line
			const lineHeight = 5; // Height of the volume line
			const lineWidth = Math.round(round(volume / 100, 2) * maxLineWidth);
			const lineX = (width - lineWidth) / 2;
			const lineY = (height - lineHeight) / 2;

			context.fillRect(lineX, lineY, lineWidth, lineHeight);
			break;
		}
		case "round": {
			const lineWidth = 5;
			const centerX = width / 2;
			const centerY = height / 2;
			const radius = Math.min(width, height, 75) / 2 - lineWidth; // Maximum radius based on canvas dimensions
			const startAngle = Math.PI + Math.PI * round(volume / 100, 2); // Start angle based on volume
			const endAngle = Math.PI - Math.PI * round(volume / 100, 2); // End angle based on volume
			// Draw the volume arc as a circle at 100% volume
			context.strokeStyle = displayColor; // Line color
			context.lineWidth = lineWidth; // Line width
			context.lineCap = "butt"; // Line cap style
			context.beginPath();
			context.arc(centerX, centerY, radius, startAngle, endAngle, true);
			context.stroke();
			break;
		}
		default:
			console.error("Invalid display type");
			break;
	}

	// Append canvas to player container if it doesn't already exist
	const existingCanvas = playerContainer.parentElement?.parentElement?.querySelector(`canvas#volume-display`);
	if (!existingCanvas) {
		playerContainer.parentElement?.parentElement?.appendChild(canvas);
	} else {
		// Update the existing canvas
		existingCanvas.replaceWith(canvas);
	}
	setTimeout(() => {
		canvas.remove();
	}, displayHideTime);
}
// #endregion Volume utility functions
// #region Utility functions
/**
 * Extracts the first section from a YouTube URL path.
 * @param {string} url - The YouTube URL.
 * @returns {string|null} The first section of the URL path, or null if not found.
 */
function extractFirstSectionFromYouTubeURL(url: string): string | null {
	const urlObj = new URL(url);
	const { pathname: path } = urlObj;
	const sections = path.split("/").filter((section) => section !== "");

	if (sections.length > 0) {
		return sections[0];
	}

	return null; // or any default value if desired
}
function isWatchPage() {
	const firstSection = extractFirstSectionFromYouTubeURL(window.location.href);
	return firstSection === "watch";
}
function isShortsPage() {
	const firstSection = extractFirstSectionFromYouTubeURL(window.location.href);
	return firstSection === "shorts";
}
// #endregion Utility functions
// Error handling
window.addEventListener("error", (event) => {
	event.preventDefault();
	browserColorLog(
		event.error instanceof Error
			? event.error.message
			: event.error instanceof Object
			? Object.hasOwnProperty.call(event.error, "toString") && typeof event.error.toString === "function"
				? event.error.toString()
				: "unknown error"
			: "",
		"FgRed"
	);
});
window.addEventListener("unhandledrejection", (event) => {
	event.preventDefault();
	browserColorLog(`Unhandled rejection: ${event.reason}`, "FgRed");
});
