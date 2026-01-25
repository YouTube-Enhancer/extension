import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { checkIfFeatureButtonExists, getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { getFeatureIcon } from "@/src/icons";
import { type YouTubePlayerDiv, youtubePlayerMinSpeed } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import OnScreenDisplayManager from "@/src/utils/OnScreenDisplayManager";
import { createTooltip, isLivePage, isWatchPage, round, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

import type { AddButtonFunction, RemoveButtonFunction } from "../index";
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

export async function updatePlaybackSpeedButtonTooltip<ButtonName extends "decreasePlaybackSpeedButton" | "increasePlaybackSpeedButton">(
	buttonName: ButtonName,
	speed: number
) {
	const {
		data: {
			options: {
				button_placements: {
					decreasePlaybackSpeedButton: decreasePlaybackSpeedButtonPlacement,
					increasePlaybackSpeedButton: increasePlaybackSpeedButtonPlacement
				},
				playback_buttons_speed: playbackSpeedPerClick
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	const minSpeed = getMinSpeed(playbackSpeedPerClick);
	({ playbackRate: currentPlaybackSpeed } = videoElement);
	const featureName = "playbackSpeedButtons";
	const button = getFeatureButton(buttonName);
	if (!button) return;
	const placement = buttonName == "increasePlaybackSpeedButton" ? increasePlaybackSpeedButtonPlacement : decreasePlaybackSpeedButtonPlacement;
	const { update } = createTooltip({
		direction: placement === "below_player" ? "down" : "up",
		element: button,
		featureName,
		id: `yte-feature-${buttonName}-tooltip`
	});
	button.dataset.title = window.i18nextInstance.t(
		currentPlaybackSpeed == maxSpeed && buttonName == "increasePlaybackSpeedButton" ?
			`pages.content.features.playbackSpeedButtons.extras.increaseLimit`
		: currentPlaybackSpeed == minSpeed && buttonName == "decreasePlaybackSpeedButton" ?
			`pages.content.features.playbackSpeedButtons.extras.decreaseLimit`
		:	`pages.content.features.playbackSpeedButtons.buttons.${buttonName as "decreasePlaybackSpeedButton" | "increasePlaybackSpeedButton"}.label`,
		{
			SPEED: speed
		}
	);
	update();
}
function getMinSpeed(playbackSpeedPerClick: number) {
	return (
		playbackSpeedPerClick == 0.25 ? 0.25
		: playbackSpeedPerClick >= 0.01 && playbackSpeedPerClick <= 0.09 ? 0.07
		: playbackSpeedPerClick == 0.1 ? 0.01
		: playbackSpeedPerClick == 1 ? 1
		: youtubePlayerMinSpeed
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
						options: { osd_display_color, osd_display_hide_time, osd_display_opacity, osd_display_padding, osd_display_position }
					}
				} = await waitForSpecificMessage("options", "request_data", "content");
				new OnScreenDisplayManager(
					{
						displayColor: osd_display_color,
						displayHideTime: osd_display_hide_time,
						displayOpacity: osd_display_opacity,
						displayPadding: osd_display_padding,
						displayPosition: osd_display_position,
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
				await updatePlaybackSpeedButtonTooltip("increasePlaybackSpeedButton", calculatePlaybackButtonSpeed(speed, playbackSpeedPerClick, "increase"));
				await updatePlaybackSpeedButtonTooltip("decreasePlaybackSpeedButton", calculatePlaybackButtonSpeed(speed, playbackSpeedPerClick, "decrease"));
			} catch (error) {
				console.error(error);
			}
		})();
	};
}

export const addIncreasePlaybackSpeedButton: AddButtonFunction = async () => {
	if (!(isWatchPage() || isLivePage())) return;
	const {
		data: {
			options: {
				button_placements: { increasePlaybackSpeedButton: increasePlaybackSpeedButtonPlacement },
				enable_playback_speed_buttons,
				playback_buttons_speed: playbackSpeedPerClick
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_playback_speed_buttons) return;
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	({ playbackRate: currentPlaybackSpeed } = videoElement);
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	if (playerVideoData.isLive && checkIfFeatureButtonExists("increasePlaybackSpeedButton", increasePlaybackSpeedButtonPlacement)) {
		await removeFeatureButton("increasePlaybackSpeedButton", increasePlaybackSpeedButtonPlacement);
		eventManager.removeEventListeners("playbackSpeedButtons");
	}
	if (playerVideoData.isLive) return;
	await addFeatureButton(
		"increasePlaybackSpeedButton",
		increasePlaybackSpeedButtonPlacement,
		window.i18nextInstance.t(
			currentPlaybackSpeed == maxSpeed ?
				`pages.content.features.playbackSpeedButtons.extras.increaseLimit`
			:	"pages.content.features.playbackSpeedButtons.buttons.increasePlaybackSpeedButton.label",
			{
				SPEED: calculatePlaybackButtonSpeed(currentPlaybackSpeed, playbackSpeedPerClick, "increase")
			}
		),
		getFeatureIcon("increasePlaybackSpeedButton", increasePlaybackSpeedButtonPlacement),
		playbackSpeedButtonClickListener(playbackSpeedPerClick, "increase"),
		false
	);
};

export const addDecreasePlaybackSpeedButton: AddButtonFunction = async () => {
	if (!(isWatchPage() || isLivePage())) return;
	const {
		data: {
			options: {
				button_placements: { decreasePlaybackSpeedButton: decreasePlaybackSpeedButtonPlacement },
				enable_playback_speed_buttons,
				playback_buttons_speed: playbackSpeedPerClick
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_playback_speed_buttons) return;
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	const minSpeed = getMinSpeed(playbackSpeedPerClick);
	({ playbackRate: currentPlaybackSpeed } = videoElement);
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	if (playerVideoData.isLive && checkIfFeatureButtonExists("decreasePlaybackSpeedButton", decreasePlaybackSpeedButtonPlacement)) {
		await removeFeatureButton("decreasePlaybackSpeedButton", decreasePlaybackSpeedButtonPlacement);
		eventManager.removeEventListeners("playbackSpeedButtons");
	}
	if (playerVideoData.isLive) return;
	await addFeatureButton(
		"decreasePlaybackSpeedButton",
		decreasePlaybackSpeedButtonPlacement,
		window.i18nextInstance.t(
			currentPlaybackSpeed == minSpeed ?
				`pages.content.features.playbackSpeedButtons.extras.decreaseLimit`
			:	"pages.content.features.playbackSpeedButtons.buttons.decreasePlaybackSpeedButton.label",
			{
				SPEED: calculatePlaybackButtonSpeed(currentPlaybackSpeed, playbackSpeedPerClick, "decrease")
			}
		),
		getFeatureIcon("decreasePlaybackSpeedButton", decreasePlaybackSpeedButtonPlacement),
		playbackSpeedButtonClickListener(playbackSpeedPerClick, "decrease"),
		false
	);
};

export const removeDecreasePlaybackSpeedButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("decreasePlaybackSpeedButton", placement);
	eventManager.removeEventListeners("playbackSpeedButtons");
};
export const removeIncreasePlaybackSpeedButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("increasePlaybackSpeedButton", placement);
	eventManager.removeEventListeners("playbackSpeedButtons");
};
