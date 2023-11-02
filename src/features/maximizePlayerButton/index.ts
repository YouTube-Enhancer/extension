import type { YouTubePlayerDiv } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";
import { makeMaximizeSVG, updateProgressBarPositions, setupVideoPlayerTimeUpdate, maximizePlayer } from "./utils";
import { addFeatureItemToMenu, getFeatureMenuItem, removeFeatureItemFromMenu } from "../featureMenu/utils";
// TODO: fix the "default/theatre" view button and pip button not making the player minimize to the previous state.
export async function addMaximizePlayerButton(): Promise<void> {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_maximize_player_button: enableMaximizePlayerButton } = options;
	// If the maximize player button option is disabled, return
	if (!enableMaximizePlayerButton) return;
	const maximizeSVG = makeMaximizeSVG();
	// Add a click event listener to the maximize button
	async function maximizePlayerButtonClickListener() {
		maximizePlayer();
		updateProgressBarPositions();
		setupVideoPlayerTimeUpdate();
	}

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
			const maximizePlayerMenuItem = getFeatureMenuItem("maximizePlayerButton");
			if (!maximizePlayerMenuItem) return;
			maximizePlayer();
			maximizePlayerMenuItem.ariaChecked = "false";
		}
	}
	addFeatureItemToMenu({
		featureName: "maximizePlayerButton",
		icon: maximizeSVG,
		label: "Maximize Player",
		listener: maximizePlayerButtonClickListener,
		isToggle: true
	});
	function ytpLeftButtonMouseEnterListener(event: MouseEvent) {
		const ytTooltip = document.querySelector("#movie_player > div.ytp-tooltip") as HTMLDivElement | null;
		if (!ytTooltip) return;
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
			const tooltipRect = ytTooltip.getBoundingClientRect();
			ytTooltip.style.top = `${buttonRect.top - tooltipRect.height - 14}px`;
			ytTooltip.style.zIndex = "2021";
		}
	}
	function ytpRightButtonMouseEnterListener(event: MouseEvent) {
		const ytTooltip = document.querySelector("#movie_player > div.ytp-tooltip") as HTMLDivElement | null;
		if (!ytTooltip) return;
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
			const tooltipRect = ytTooltip.getBoundingClientRect();
			ytTooltip.style.left = `${buttonRect.left - 48}px`;
			ytTooltip.style.top = `${buttonRect.top - tooltipRect.height - 14}px`;
			ytTooltip.style.zIndex = "2021";
		}
	}
	function seekBarMouseEnterListener(event: MouseEvent) {
		// TODO: get the seek preview to be in the correct place when the video is maximized from default view
		const ytTooltip = document.querySelector("#movie_player > div.ytp-tooltip") as HTMLDivElement | null;
		if (!ytTooltip) return;
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
			const tooltipRect = ytTooltip.getBoundingClientRect();
			ytTooltip.style.top = `${buttonRect.top - tooltipRect.height - 14}px`;
			ytTooltip.style.zIndex = "2021";
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
export async function removeMaximizePlayerButton(): Promise<void> {
	removeFeatureItemFromMenu("maximizePlayerButton");
	eventManager.removeEventListeners("maximizePlayerButton");
}
