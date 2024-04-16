import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";
import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, updateFeatureButtonIcon, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { createTooltip, waitForSpecificMessage } from "@/src/utils/utilities";

import { maximizePlayer, setupVideoPlayerTimeUpdate, updateProgressBarPositions } from "./utils";
// TODO: fix the "default/theatre" view button and pip button not making the player minimize to the previous state.
export const addMaximizePlayerButton: AddButtonFunction = async () => {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: {
				button_placements: { maximizePlayerButton: maximizePlayerButtonPlacement },
				enable_maximize_player_button: enableMaximizePlayerButton
			}
		}
	} = optionsData;
	// If the maximize player button option is disabled, return
	if (!enableMaximizePlayerButton) return;
	// Add a click event listener to the maximize button
	function maximizePlayerButtonClickListener(checked?: boolean) {
		const button = getFeatureButton("maximizePlayerButton");
		if (!button) return;
		const featureName = "maximizePlayerButton";
		const { remove } = createTooltip({
			direction: maximizePlayerButtonPlacement === "below_player" ? "down" : "up",
			element: button,
			featureName,
			id: `yte-feature-${featureName}-tooltip`
		});
		if (checked !== undefined) {
			if (checked) remove();
			updateFeatureButtonTitle(
				"maximizePlayerButton",
				window.i18nextInstance.t(`pages.content.features.maximizePlayerButton.button.toggle.${checked ? "on" : "off"}`)
			);
		}
		maximizePlayer();
		updateProgressBarPositions();
		setupVideoPlayerTimeUpdate();
	}

	const pipElement: Nullable<HTMLButtonElement> = document.querySelector("button.ytp-pip-button");
	const sizeElement: Nullable<HTMLButtonElement> = document.querySelector("button.ytp-size-button");
	const miniPlayerElement: Nullable<HTMLButtonElement> = document.querySelector("button.ytp-miniplayer-button");
	function otherElementClickListener() {
		// Get the video element
		const videoElement = document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
		// If video element is not available, return
		if (!videoElement) return;
		const videoContainer = document.querySelector<YouTubePlayerDiv>("#movie_player");
		if (!videoContainer) return;
		if (videoContainer.classList.contains("maximized_video_container") && videoElement.classList.contains("maximized_video")) {
			const maximizePlayerButton = getFeatureButton("maximizePlayerButton");
			if (!maximizePlayerButton) return;
			maximizePlayer();
			maximizePlayerButton.ariaChecked = "false";
			const button = getFeatureButton("maximizePlayerButton");
			const icon = getFeatureIcon("maximizePlayerButton", "shared_icon_position");
			if (button && button instanceof HTMLButtonElement) {
				if (typeof icon === "object" && "off" in icon && "on" in icon) updateFeatureButtonIcon(button, icon.off);
				updateFeatureButtonTitle("maximizePlayerButton", window.i18nextInstance.t("pages.content.features.maximizePlayerButton.button.toggle.off"));
			}
		}
	}
	await addFeatureButton(
		"maximizePlayerButton",
		maximizePlayerButtonPlacement,
		maximizePlayerButtonPlacement === "feature_menu" ?
			window.i18nextInstance.t("pages.content.features.maximizePlayerButton.button.label")
		:	window.i18nextInstance.t("pages.content.features.maximizePlayerButton.button.toggle.off"),
		getFeatureIcon("maximizePlayerButton", maximizePlayerButtonPlacement !== "feature_menu" ? "shared_icon_position" : "feature_menu"),
		maximizePlayerButtonClickListener,
		true
	);
	function ytpLeftButtonMouseEnterListener(event: MouseEvent) {
		const ytTooltip = document.querySelector<HTMLDivElement>("#movie_player > div.ytp-tooltip");
		if (!ytTooltip) return;
		// Get the video element
		const videoElement = document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
		// If video element is not available, return
		if (!videoElement) return;
		const videoContainer = document.querySelector<YouTubePlayerDiv>("#movie_player");
		if (!videoContainer) return;
		const controlsElement = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
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
		const ytTooltip = document.querySelector<HTMLDivElement>("#movie_player > div.ytp-tooltip");
		if (!ytTooltip) return;
		// Get the video element
		const videoElement = document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
		// If video element is not available, return
		if (!videoElement) return;
		const videoContainer = document.querySelector<YouTubePlayerDiv>("#movie_player");
		if (!videoContainer) return;
		const controlsElement = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
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
		const ytTooltip = document.querySelector<HTMLDivElement>("#movie_player > div.ytp-tooltip");
		if (!ytTooltip) return;
		// Get the video element
		const videoElement = document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
		// If video element is not available, return
		if (!videoElement) return;
		const videoContainer = document.querySelector<YouTubePlayerDiv>("#movie_player");
		if (!videoContainer) return;
		const controlsElement = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
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
		...document.querySelectorAll<HTMLButtonElement>("div.ytp-chrome-controls > div.ytp-left-controls > :not(.yte-maximized-player-button)")
	];
	const volumePanel = document.querySelector<HTMLButtonElement>("div.ytp-chrome-controls > div.ytp-left-controls > span > div");
	const seekBarContainer = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom > div.ytp-progress-bar");
	if (!seekBarContainer) return;
	if (volumePanel) typLeftButtons.push(volumePanel);
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore TODO: figure out the proper type for this
	eventManager.addEventListener(seekBarContainer, "mouseenter", seekBarMouseEnterListener, "maximizePlayerButton");

	const typRightButtons = document.querySelectorAll<HTMLButtonElement>(
		"div.ytp-chrome-controls > div.ytp-right-controls > :not(.yte-maximized-player-button)"
	);
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
};
export const removeMaximizePlayerButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("maximizePlayerButton", placement);
	eventManager.removeEventListeners("maximizePlayerButton");
};
