import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import {
	checkIfFeatureButtonExists,
	getFeatureButton,
	getFeatureButtonId,
	updateFeatureButtonIcon,
	updateFeatureButtonTitle
} from "@/src/features/buttonPlacement/utils";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { createResetPlaybackSpeedDisplaySVG, getFeatureIcon } from "@/src/icons";
import { type ButtonPlacement, type YouTubePlayerDiv, youtubePlayerMaxSpeed } from "@/src/types";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForElement } from "@/src/utils/dom/wait";
import { round } from "@/src/utils/math";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import { metadata } from "./index.metadata";

function formatSpeedLabel(speed: number) {
	return `${round(speed, 2)}x`;
}

function getResetButtonTitle(targetSpeed: number) {
	return window.i18nextInstance.t((translations) => translations.pages.content.features.resetPlaybackSpeedButton.button.label, {
		SPEED: round(targetSpeed, 2)
	});
}

async function getResetTargetSpeed() {
	const {
		data: {
			options: {
				playerSpeed: { speed: playerSpeed },
				resetPlaybackSpeedButton: { resetToPlayerSpeed }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	return resetToPlayerSpeed ? playerSpeed : 1;
}

function placeResetBetweenSpeedButtons() {
	const decrease = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId("decreasePlaybackSpeedButton")}`);
	const increase = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId("increasePlaybackSpeedButton")}`);
	const reset = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId("resetPlaybackSpeedButton")}`);
	if (!decrease || !increase || !reset) return;
	const { parentElement } = decrease;
	if (!parentElement || parentElement !== increase.parentElement || parentElement !== reset.parentElement) return;
	increase.before(reset);
}

function rateChangeListener() {
	const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoElement) return;
	updateResetSpeedDisplay(videoElement.playbackRate);
}

async function refreshResetButtonTooltip(placement: ButtonPlacement) {
	const button = getFeatureButton("resetPlaybackSpeedButton");
	if (!button) return;
	const targetSpeed = await getResetTargetSpeed();
	const title = getResetButtonTitle(targetSpeed);
	button.dataset.title = title;
	updateFeatureButtonTitle("resetPlaybackSpeedButton", title);
	const { update } = createTooltip({
		direction: placement === "below_player" ? "down" : "up",
		element: button,
		featureName: "resetPlaybackSpeedButton",
		id: "yte-feature-resetPlaybackSpeedButton-tooltip"
	});
	update();
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
		await refreshResetButtonTooltip(placement);
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
