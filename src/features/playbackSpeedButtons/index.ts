import type { AllButtonNames, YouTubePlayerDiv } from "@/src/types";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import OnScreenDisplayManager from "@/src/utils/OnScreenDisplayManager";
import { createTooltip, isShortsPage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

import type { AddButtonFunction, RemoveButtonFunction } from "../index";
let currentPlaybackSpeed = 1;

async function updateTooltip<ButtonName extends AllButtonNames>(
	buttonName: ButtonName extends "decreasePlaybackSpeedButton" | "increasePlaybackSpeedButton" ? ButtonName : never,
	speed: string
) {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: {
				button_placements: {
					decreasePlaybackSpeedButton: decreasePlaybackSpeedButtonPlacement,
					increasePlaybackSpeedButton: increasePlaybackSpeedButtonPlacement
				}
			}
		}
	} = optionsData;
	const featureName = "playbackSpeedButtons";
	const button = getFeatureButton(buttonName);
	if (!button) return;
	const placement = buttonName == "increasePlaybackSpeedButton" ? increasePlaybackSpeedButtonPlacement : decreasePlaybackSpeedButtonPlacement;
	const { remove } = createTooltip({
		direction: placement === "below_player" ? "down" : "up",
		element: button,
		featureName,
		id: `yte-feature-${featureName}-tooltip`
	});
	remove();
	updateFeatureButtonTitle(
		buttonName,
		//@ts-expect-error ↓↓↓
		// TODO: Adjust i18n types so it won't cause an error
		window.i18nextInstance.t(`pages.content.features.playbackSpeedButtons.buttons.${buttonName}.label`, {
			SPEED: speed
		})
	);
}

function playbackSpeedButtonClickListener(amount: number): () => void {
	return () => {
		void (async () => {
			const videoElement = document.querySelector<HTMLVideoElement>("video");
			if (!videoElement) return;
			try {
				const { playbackRate: playbackRate } = videoElement;
				currentPlaybackSpeed = playbackRate;
				if (currentPlaybackSpeed + amount <= 0) return;
				if (currentPlaybackSpeed + amount > 4) return;
				const playerContainer =
					isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
					: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
					: null;
				if (!playerContainer) return;
				const optionsData = await waitForSpecificMessage("options", "request_data", "content");
				const {
					data: {
						options: {
							osd_display_color,
							osd_display_hide_time,
							osd_display_opacity,
							osd_display_padding,
							osd_display_position,
							playback_buttons_speed: playbackSpeedPerClick
						}
					}
				} = optionsData;
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
						max: 4,
						type: "speed",
						value: currentPlaybackSpeed + amount
					}
				);
				const speed = currentPlaybackSpeed + amount;
				await setPlayerSpeed(speed);
				await updateTooltip("increasePlaybackSpeedButton", String(speed + playbackSpeedPerClick));
				await updateTooltip("decreasePlaybackSpeedButton", String(speed - playbackSpeedPerClick));
			} catch (error) {
				console.error(error);
			}
		})();
	};
}

export const addIncreasePlaybackSpeedButton: AddButtonFunction = async () => {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: {
				button_placements: { increasePlaybackSpeedButton: increasePlaybackSpeedButtonPlacement },
				enable_playback_speed_buttons,
				playback_buttons_speed: playbackSpeedPerClick
			}
		}
	} = optionsData;
	if (!enable_playback_speed_buttons) return;
	await addFeatureButton(
		"increasePlaybackSpeedButton",
		increasePlaybackSpeedButtonPlacement,
		window.i18nextInstance.t("pages.content.features.playbackSpeedButtons.buttons.increasePlaybackSpeedButton.label", {
			SPEED: currentPlaybackSpeed + playbackSpeedPerClick
		}),
		getFeatureIcon("increasePlaybackSpeedButton", increasePlaybackSpeedButtonPlacement !== "feature_menu" ? "shared_icon_position" : "feature_menu"),
		playbackSpeedButtonClickListener(playbackSpeedPerClick),
		false
	);
};

export const addDecreasePlaybackSpeedButton: AddButtonFunction = async () => {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: {
				button_placements: { decreasePlaybackSpeedButton: decreasePlaybackSpeedButtonPlacement },
				enable_playback_speed_buttons,
				playback_buttons_speed: playbackSpeedPerClick
			}
		}
	} = optionsData;
	if (!enable_playback_speed_buttons) return;
	await addFeatureButton(
		"decreasePlaybackSpeedButton",
		decreasePlaybackSpeedButtonPlacement,
		window.i18nextInstance.t("pages.content.features.playbackSpeedButtons.buttons.decreasePlaybackSpeedButton.label", {
			SPEED: currentPlaybackSpeed - playbackSpeedPerClick
		}),
		getFeatureIcon("decreasePlaybackSpeedButton", decreasePlaybackSpeedButtonPlacement !== "feature_menu" ? "shared_icon_position" : "feature_menu"),
		playbackSpeedButtonClickListener(-playbackSpeedPerClick),
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
