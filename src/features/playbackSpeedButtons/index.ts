import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { checkIfFeatureButtonExists, getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { getFeatureIcon } from "@/src/icons";
import { type ButtonPlacement, type FullscreenPlacement, type YouTubePlayerDiv, youtubePlayerMinSpeed } from "@/src/types";
import OnScreenDisplayManager from "@/src/ui/OnScreenDisplayManager";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForElement } from "@/src/utils/dom/wait";
import { round } from "@/src/utils/math";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import { metadata } from "./index.metadata";

let currentPlaybackSpeed = 1;
const maxSpeed = 16;
export function calculatePlaybackButtonSpeed(speed: number, playbackSpeedPerClick: number, direction: "decrease" | "increase") {
	const minSpeed = getMinSpeed(playbackSpeedPerClick);
	const calculatedSpeed =
		speed >= maxSpeed && direction == "increase" ? maxSpeed
		: (speed <= minSpeed || speed - playbackSpeedPerClick <= 0) && direction == "decrease" ? minSpeed
		: direction == "decrease" ? speed - playbackSpeedPerClick
		: speed + playbackSpeedPerClick;
	return round(calculatedSpeed, 2);
}

export function getMinSpeed(playbackSpeedPerClick: number) {
	return (
		playbackSpeedPerClick == 0.25 ? 0.25
		: playbackSpeedPerClick >= 0.01 && playbackSpeedPerClick <= 0.09 ? 0.07
		: playbackSpeedPerClick == 0.1 ? 0.01
		: playbackSpeedPerClick == 1 ? 1
		: youtubePlayerMinSpeed
	);
}
export async function updatePlaybackSpeedButtonTooltips(currentPlaybackSpeed: number, playbackSpeedPerClick: number) {
	const {
		data: {
			options: {
				playbackSpeedButtons: {
					button: { placement }
				}
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	const minSpeed = getMinSpeed(playbackSpeedPerClick);
	const buttons = [
		{
			buttonName: "increasePlaybackSpeedButton" as const,
			speed: calculatePlaybackButtonSpeed(currentPlaybackSpeed, playbackSpeedPerClick, "increase")
		},
		{
			buttonName: "decreasePlaybackSpeedButton" as const,
			speed: calculatePlaybackButtonSpeed(currentPlaybackSpeed, playbackSpeedPerClick, "decrease")
		}
	];
	for (const { buttonName, speed } of buttons) {
		const button = getFeatureButton(buttonName);
		if (!button) continue;
		const { update } = createTooltip({
			direction: placement === "below_player" ? "down" : "up",
			element: button,
			featureName: "playbackSpeedButtons",
			id: `yte-feature-${buttonName}-tooltip`
		});
		button.dataset.title = getPlaybackButtonTitle(buttonName, currentPlaybackSpeed, minSpeed, speed);
		update();
	}
}

async function addPlaybackSpeedButton(
	buttonName: "decreasePlaybackSpeedButton" | "increasePlaybackSpeedButton",
	placement: ButtonPlacement,
	speed: number,
	direction: "decrease" | "increase",
	fullscreenPlacement: FullscreenPlacement
) {
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	const minSpeed = getMinSpeed(speed);
	({ playbackRate: currentPlaybackSpeed } = videoElement);
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	if (playerVideoData.isLive && (await checkIfFeatureButtonExists(buttonName, placement))) {
		await removeFeatureButton(buttonName, placement);
		eventManager.removeEventListeners("playbackSpeedButtons");
	}
	if (playerVideoData.isLive) return;
	await addFeatureButton(
		buttonName,
		placement,
		getPlaybackButtonTitle(buttonName, currentPlaybackSpeed, minSpeed, calculatePlaybackButtonSpeed(currentPlaybackSpeed, speed, direction)),
		getFeatureIcon(buttonName, placement),
		playbackSpeedButtonClickListener(speed, direction),
		false,
		false,
		fullscreenPlacement
	);
}

function getPlaybackButtonTitle(
	buttonName: "decreasePlaybackSpeedButton" | "increasePlaybackSpeedButton",
	currentPlaybackSpeed: number,
	minSpeed: number,
	speed: number
) {
	return window.i18nextInstance.t(
		(translations) =>
			currentPlaybackSpeed == maxSpeed && buttonName == "increasePlaybackSpeedButton" ?
				translations.pages.content.features.playbackSpeedButtons.extras.increaseLimit
			: currentPlaybackSpeed == minSpeed && buttonName == "decreasePlaybackSpeedButton" ?
				translations.pages.content.features.playbackSpeedButtons.extras.decreaseLimit
			:	translations.pages.content.features.playbackSpeedButtons.buttons[buttonName].label,
		{
			SPEED: speed
		}
	);
}

function playbackSpeedButtonClickListener(playbackSpeedPerClick: number, direction: "decrease" | "increase"): () => void {
	return () => {
		void (async () => {
			const videoElement = document.querySelector<HTMLVideoElement>("video");
			if (!videoElement) return;
			const minSpeed = getMinSpeed(playbackSpeedPerClick);
			const adjustmentAmount = direction === "increase" ? playbackSpeedPerClick : -playbackSpeedPerClick;
			try {
				({ playbackRate: currentPlaybackSpeed } = videoElement);
				if (
					currentPlaybackSpeed + adjustmentAmount > maxSpeed ||
					currentPlaybackSpeed + adjustmentAmount < minSpeed ||
					currentPlaybackSpeed + adjustmentAmount <= 0
				)
					return;
				const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
				if (!playerContainer) return;
				const {
					data: {
						options: {
							onScreenDisplay: { color, hideTime, opacity, padding, position }
						}
					}
				} = await waitForSpecificMessage("options", "request_data", "content");
				new OnScreenDisplayManager(
					{
						displayColor: color,
						displayHideTime: hideTime,
						displayOpacity: opacity,
						displayPadding: padding,
						displayPosition: position,
						displayType: "text", // TODO: support for line/round? currently buggy
						playerContainer: playerContainer
					},
					"yte-osd",
					{
						max: maxSpeed,
						type: "speed",
						value: round(currentPlaybackSpeed + adjustmentAmount, 2)
					}
				);
				const speed = round(currentPlaybackSpeed + adjustmentAmount, 2);
				await setPlayerSpeed(speed);
				await updatePlaybackSpeedButtonTooltips(speed, playbackSpeedPerClick);
			} catch (error) {
				console.error("[playbackSpeedButtons] Failed to set player speed:", error);
			}
		})();
	};
}

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement }, speed }) => {
				await addPlaybackSpeedButton("decreasePlaybackSpeedButton", placement, speed, "decrease", fullscreenPlacement);
			},
			name: "decreasePlaybackSpeedButton",
			remove: async (placement) => {
				await removeFeatureButton("decreasePlaybackSpeedButton", placement);
				eventManager.removeEventListeners("playbackSpeedButtons");
			}
		},
		{
			add: async ({ button: { fullscreenPlacement, placement }, speed }) => {
				await addPlaybackSpeedButton("increasePlaybackSpeedButton", placement, speed, "increase", fullscreenPlacement);
			},
			name: "increasePlaybackSpeedButton",
			remove: async (placement) => {
				await removeFeatureButton("increasePlaybackSpeedButton", placement);
				eventManager.removeEventListeners("playbackSpeedButtons");
			}
		}
	],
	dependencies: { includePages: ["watch"] },
	onConfigChange: async ({ speed: playbackSpeedPerClick }) => {
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		if (!playerContainer) return;
		const video = playerContainer.querySelector<HTMLVideoElement>("video.html5-main-video");
		if (!video) return;
		const { playbackRate: speed } = video;
		await updatePlaybackSpeedButtonTooltips(speed, playbackSpeedPerClick);
	}
});
