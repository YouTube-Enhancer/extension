import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import {
	addFeatureButton,
	checkIfFeatureButtonExists,
	getFeatureButton,
	removeFeatureButton,
	updateFeatureButtonIcon
} from "@/src/features/buttonController";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { createResetPlaybackSpeedDisplaySVG, getFeatureIcon } from "@/src/icons";
import { type YouTubePlayerDiv, youtubePlayerMaxSpeed } from "@/src/types";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { waitForElement } from "@/src/utils/dom/wait";
import { round } from "@/src/utils/math";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import { metadata } from "./index.metadata";
import { placeResetBetweenSpeedButtons } from "./placeResetBetweenSpeedButtons";
import { getResetButtonTitle, getResetTargetSpeed, refreshResetButtonTooltip } from "./tooltip";

function formatSpeedLabel(speed: number) {
	return `${round(speed, 2)}x`;
}

function rateChangeListener() {
	const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoElement) return;
	updateResetSpeedDisplay(videoElement.playbackRate);
}

async function resetPlaybackSpeedButtonClickListener() {
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	try {
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		if (!playerContainer) return;
		const {
			data: {
				options: {
					onScreenDisplay: { color, hideTime, opacity, padding, position },
					playbackSpeedButtons: { speed: playbackSpeedPerClick }
				}
			}
		} = await waitForSpecificMessage("options", "request_data", "content");
		const targetSpeed = await getResetTargetSpeed();
		new OnScreenDisplayManager(
			{
				displayColor: color,
				displayHideTime: hideTime,
				displayOpacity: opacity,
				displayPadding: padding,
				displayPosition: position,
				displayType: "text",
				playerContainer
			},
			"yte-osd",
			{
				max: youtubePlayerMaxSpeed,
				type: "speed",
				value: round(targetSpeed, 2)
			}
		);
		await setPlayerSpeed(targetSpeed);
		updateResetSpeedDisplay(targetSpeed);
		await updatePlaybackSpeedButtonTooltips(targetSpeed, playbackSpeedPerClick);
	} catch (error) {
		console.error("[resetPlaybackSpeedButton] Failed to reset player speed:", error);
	}
}

function updateResetSpeedDisplay(speed: number) {
	const button = getFeatureButton("resetPlaybackSpeedButton");
	if (!button || !(button instanceof HTMLButtonElement)) return;
	const icon = button.querySelector("svg");
	if (!icon) return;
	const text = icon.querySelector("text");
	if (!text) return;
	text.textContent = formatSpeedLabel(speed);
}

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (!videoElement) return;
				const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
				if (!playerContainer) return;
				const playerVideoData = await playerContainer.getVideoData();
				if (playerVideoData.isLive) {
					if (await checkIfFeatureButtonExists("resetPlaybackSpeedButton", placement)) {
						await removeFeatureButton("resetPlaybackSpeedButton", placement);
						eventManager.removeEventListeners("resetPlaybackSpeedButton");
					}
					return;
				}
				const { playbackRate: currentSpeed } = videoElement;
				const targetSpeed = await getResetTargetSpeed();
				const icon =
					placement === "feature_menu" ? getFeatureIcon("resetPlaybackSpeedButton", placement) : createResetPlaybackSpeedDisplaySVG(currentSpeed);
				await addFeatureButton(
					"resetPlaybackSpeedButton",
					placement,
					getResetButtonTitle(targetSpeed),
					icon,
					() => void resetPlaybackSpeedButtonClickListener(),
					false,
					false,
					fullscreenPlacement
				);
				placeResetBetweenSpeedButtons();
				eventManager.removeEventListener(videoElement, "ratechange", "resetPlaybackSpeedButton");
				eventManager.addEventListener(videoElement, "ratechange", rateChangeListener, "resetPlaybackSpeedButton");
			},
			name: "resetPlaybackSpeedButton",
			remove: async (placement) => {
				await removeFeatureButton("resetPlaybackSpeedButton", placement);
				eventManager.removeEventListeners("resetPlaybackSpeedButton");
			}
		}
	],
	onConfigChange: async ({ button: { placement } }) => {
		await refreshResetButtonTooltip();
		const button = getFeatureButton("resetPlaybackSpeedButton");
		if (!button || !(button instanceof HTMLButtonElement) || placement === "feature_menu") return;
		const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		if (!videoElement) return;
		const icon = button.querySelector("svg");
		if (icon?.querySelector("text")) {
			updateResetSpeedDisplay(videoElement.playbackRate);
			return;
		}
		updateFeatureButtonIcon(button, createResetPlaybackSpeedDisplaySVG(videoElement.playbackRate));
	},
	onDisable: () => {
		eventManager.removeEventListeners("resetPlaybackSpeedButton");
	}
});
