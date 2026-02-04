import { Measure, seconds } from "safe-units";

import type { YouTubePlayerDiv } from "@/src/types";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

import type { AddButtonFunction, RemoveButtonFunction } from "../index";
const speedButtonListener = async (direction: "backward" | "forward", timeAdjustment: number) => {
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	// If player element is not available, return
	if (!playerContainer) return;
	if (!playerContainer.seekTo) return;
	const currentTime = await playerContainer.getCurrentTime();
	await playerContainer.seekTo(currentTime + timeAdjustment * (direction === "forward" ? 1 : -1), true);
};
export const addForwardButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { forwardButton: forwardButtonPlacement },
				enable_forward_rewind_buttons,
				forward_rewind_buttons_time
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_forward_rewind_buttons) return;
	if (!isWatchPage()) return;
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	// If player element is not available, return
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	await addFeatureButton(
		"forwardButton",
		forwardButtonPlacement,
		window.i18nextInstance.t((translations) => translations.pages.content.features.forwardRewindButtons.buttons.forwardButton.label, {
			TIME: Measure.of(forward_rewind_buttons_time, seconds).toString()
		}),
		getFeatureIcon("forwardButton", forwardButtonPlacement),
		() => void speedButtonListener("forward", forward_rewind_buttons_time),
		false
	);
};
export const addRewindButton: AddButtonFunction = async () => {
	const {
		data: {
			options: {
				button_placements: { rewindButton: rewindButtonPlacement },
				enable_forward_rewind_buttons,
				forward_rewind_buttons_time
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_forward_rewind_buttons) return;
	if (!isWatchPage()) return;
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	// If player element is not available, return
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	await addFeatureButton(
		"rewindButton",
		rewindButtonPlacement,
		window.i18nextInstance.t((translations) => translations.pages.content.features.forwardRewindButtons.buttons.rewindButton.label, {
			TIME: Measure.of(forward_rewind_buttons_time, seconds).toString()
		}),
		getFeatureIcon("rewindButton", rewindButtonPlacement),
		() => void speedButtonListener("backward", forward_rewind_buttons_time),
		false
	);
};

export const removeForwardButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("forwardButton", placement);
	eventManager.removeEventListeners("forwardRewindButtons");
};
export const removeRewindButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("rewindButton", placement);
	eventManager.removeEventListeners("forwardRewindButtons");
};
