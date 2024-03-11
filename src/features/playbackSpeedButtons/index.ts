import type { YouTubePlayerDiv } from "@/src/types";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
//import { getFeatureButton, getFeatureButtonId } from "@/src/features/buttonPlacement/utils";
import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import OnScreenDisplayManager from "@/src/utils/OnScreenDisplayManager";
import { isShortsPage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

import type { AddButtonFunction, RemoveButtonFunction } from "../index";
//import { loopButtonClickListener } from "./utils";

function playbackSpeedButtonClickListener(amount: number): () => void {
	return () => {
			void (async () => {
					// Get the video element
					const videoElement = document.querySelector<HTMLVideoElement>("video");
					// If video element is not available, return
					if (!videoElement) return;
					try {
						const { playbackRate: currentPlaybackSpeed } = videoElement;
						const playerContainer =
						isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
						: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
						: null;
					// If player element is not available, return
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
						await setPlayerSpeed(currentPlaybackSpeed + amount);
					} catch (error) {
						console.error(error);
					}
			})();
	};
}

export const addIncreasePlaybackSpeedButton: AddButtonFunction = async () => {
	// Wait for the "options" message from the content script
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
		window.i18nextInstance.t("pages.content.features.playbackSpeedButtons.buttons.increasePlaybackSpeedButton.label", { SPEED: playbackSpeedPerClick }),
		getFeatureIcon("increasePlaybackSpeedButton", increasePlaybackSpeedButtonPlacement !== "feature_menu" ? "shared_icon_position" : "feature_menu"),
		playbackSpeedButtonClickListener(playbackSpeedPerClick),
		false
	);
};

export const addDecreasePlaybackSpeedButton: AddButtonFunction = async () => {
	// Wait for the "options" message from the content script
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
		window.i18nextInstance.t("pages.content.features.playbackSpeedButtons.buttons.decreasePlaybackSpeedButton.label", { SPEED: playbackSpeedPerClick }),
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