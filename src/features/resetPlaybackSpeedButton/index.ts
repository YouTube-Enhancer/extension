import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import {
	addFeatureButton,
	checkIfFeatureButtonExists,
	getFeatureButton,
	removeFeatureButton,
	updateFeatureButtonIcon
} from "@/src/features/buttonController";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { createResetPlaybackSpeedDisplaySVG, getFeatureIcon, updateResetPlaybackSpeedDisplaySVG } from "@/src/icons";
import { type ButtonPlacement, type FullscreenPlacement, type YouTubePlayerDiv, youtubePlayerMaxSpeed } from "@/src/types";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { waitForElement } from "@/src/utils/dom/wait";
import { round } from "@/src/utils/math";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import { metadata } from "./index.metadata";
import { placeResetBetweenSpeedButtons } from "./placeResetBetweenSpeedButtons";
import { getResetButtonTitle, getResetTargetSpeed, refreshResetButtonTooltip } from "./tooltip";

async function addResetPlaybackSpeedButton(placement: ButtonPlacement, fullscreenPlacement: FullscreenPlacement, resetToPlayerSpeed: boolean) {
	const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video") ?? document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return false;
	const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return false;
	try {
		const playerVideoData = await playerContainer.getVideoData();
		if (playerVideoData?.isLive) {
			if (await checkIfFeatureButtonExists("resetPlaybackSpeedButton", placement)) {
				await removeFeatureButton("resetPlaybackSpeedButton", placement);
				eventManager.removeEventListeners("resetPlaybackSpeedButton");
			}
			return true;
		}
	} catch {
		return false;
	}
	if (await checkIfFeatureButtonExists("resetPlaybackSpeedButton", placement)) {
		placeResetBetweenSpeedButtons();
		return true;
	}
	const { playbackRate: currentSpeed } = videoElement;
	const targetSpeed = await getResetTargetSpeed(resetToPlayerSpeed);
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
	return true;
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
			data: { options }
		} = await waitForSpecificMessage("options", "request_data", "content");
		const { onScreenDisplay, playbackSpeedButtons } = options;
		const { color, hideTime, opacity, padding, position } = onScreenDisplay;
		const { speed: playbackSpeedPerClick = 0.25 } = playbackSpeedButtons ?? {};
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
	updateResetPlaybackSpeedDisplaySVG(icon, speed);
}

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement }, resetToPlayerSpeed }) => {
				await registry.playerManager.executeWithRetries(
					metadata.id,
					[() => addResetPlaybackSpeedButton(placement, fullscreenPlacement, resetToPlayerSpeed)],
					["addResetButton"],
					{ pageTypes: ["watch"], waitForLoaded: false }
				);
			},
			name: "resetPlaybackSpeedButton",
			remove: async (placement) => {
				registry.playerManager.cleanup(metadata.id);
				await removeFeatureButton("resetPlaybackSpeedButton", placement);
				eventManager.removeEventListeners("resetPlaybackSpeedButton");
			}
		}
	],
	onConfigChange: async ({ button: { placement } }) => {
		await refreshResetButtonTooltip();
		const button = getFeatureButton("resetPlaybackSpeedButton");
		if (!button || !(button instanceof HTMLButtonElement) || placement === "feature_menu") return;
		const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video") ?? document.querySelector<HTMLVideoElement>("video");
		if (!videoElement) return;
		const icon = button.querySelector("svg");
		if (icon?.querySelector("text")) {
			updateResetSpeedDisplay(videoElement.playbackRate);
			return;
		}
		updateFeatureButtonIcon(button, createResetPlaybackSpeedDisplaySVG(videoElement.playbackRate));
	}
});
