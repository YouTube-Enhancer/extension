import { YouTubePlayerDiv } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";
import { makeMaximizeSVG, updateProgressBarPositions, setupVideoPlayerTimeUpdate, maximizePlayer } from "./utils";
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
		// TODO: get the seek preview to be in the correct place when the video is maximized from default view
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
export async function removeMaximizePlayerButton(): Promise<void> {
	// Try to get the existing maximize player button element
	const maximizePlayerButton = document.querySelector("button.yte-maximize-player-button") as HTMLButtonElement | null;
	// If maximize player button is not available, return
	if (!maximizePlayerButton) return;
	// Remove the maximize player button element
	maximizePlayerButton.remove();
	eventManager.removeEventListeners("maximizePlayerButton");
}
