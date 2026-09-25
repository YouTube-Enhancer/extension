import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, checkIfFeatureButtonExists, getFeatureButton, removeFeatureButton } from "@/src/features/buttonController";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { getFeatureIcon } from "@/src/icons";
import { type ButtonPlacement, type FullscreenPlacement, type YouTubePlayerDiv } from "@/src/types";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForElement } from "@/src/utils/dom/wait";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { getOSDConfig, showOSD } from "@/src/utils/osd";
import { calculateAdjustedSpeed, getMinSpeed } from "@/src/utils/speed";

import { metadata } from "./index.metadata";

let currentPlaybackSpeed = 1;
const maxSpeed = 16;
export async function updatePlaybackSpeedButtonTooltips(currentPlaybackSpeed: number, playbackSpeedPerClick: number) {
	if (!isFinite(currentPlaybackSpeed) || !isFinite(playbackSpeedPerClick) || playbackSpeedPerClick <= 0) return;
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	const buttons = [
		{ buttonName: "increasePlaybackSpeedButton" as const, direction: "increase" as const },
		{ buttonName: "decreasePlaybackSpeedButton" as const, direction: "decrease" as const }
	];
	if (buttons.every(({ buttonName }) => !getFeatureButton(buttonName))) return;
	const {
		data: {
			options: {
				playbackSpeedButtons: {
					button: { placement }
				}
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	const minSpeed = getMinSpeed(playbackSpeedPerClick);
	for (const { buttonName, direction } of buttons) {
		// Resolved after the options request: a relocation or navigation that ran meanwhile has replaced the button.
		const button = getFeatureButton(buttonName);
		if (!button) continue;
		const speed = calculateAdjustedSpeed(currentPlaybackSpeed, playbackSpeedPerClick, direction);
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
		getPlaybackButtonTitle(buttonName, currentPlaybackSpeed, minSpeed, calculateAdjustedSpeed(currentPlaybackSpeed, speed, direction)),
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
			try {
				({ playbackRate: currentPlaybackSpeed } = videoElement);
				const newSpeed = calculateAdjustedSpeed(currentPlaybackSpeed, playbackSpeedPerClick, direction);
				if (newSpeed === currentPlaybackSpeed) return;
				const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
				if (!playerContainer) return;
				const onScreenDisplay = getOSDConfig();
				if (onScreenDisplay) {
					showOSD(onScreenDisplay, playerContainer, { max: maxSpeed, type: "speed", value: newSpeed }, "text");
				}
				await setPlayerSpeed(newSpeed);
				await updatePlaybackSpeedButtonTooltips(newSpeed, playbackSpeedPerClick);
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
	onConfigChange: async ({ speed: playbackSpeedPerClick }) => {
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		if (!playerContainer) return;
		const video = playerContainer.querySelector<HTMLVideoElement>("video.html5-main-video");
		if (!video) return;
		const { playbackRate: speed } = video;
		await updatePlaybackSpeedButtonTooltips(speed, playbackSpeedPerClick);
	}
});
