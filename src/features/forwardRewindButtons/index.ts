import { Measure, seconds } from "safe-units";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import { type YouTubePlayerDiv } from "@/src/types";
import { waitForElement } from "@/src/utils/dom/wait";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import { metadata } from "./index.metadata";

const speedButtonListener = async (direction: "backward" | "forward") => {
	const {
		data: {
			options: {
				forwardRewindButtons: { time }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	// If player element is not available, return
	if (!playerContainer) return;
	if (!playerContainer.seekTo) return;
	const currentTime = await playerContainer.getCurrentTime();
	await playerContainer.seekTo(currentTime + time * (direction === "forward" ? 1 : -1), true);
};
export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement }, time }) => {
				const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
				if (!playerContainer) return;
				const playerVideoData = await playerContainer.getVideoData();
				if (playerVideoData.isLive) return;
				await addFeatureButton(
					"rewindButton",
					placement,
					window.i18nextInstance.t((translations) => translations.pages.content.features.forwardRewindButtons.buttons.rewindButton.label, {
						TIME: Measure.of(time, seconds).toString()
					}),
					getFeatureIcon("rewindButton", placement),
					() => void speedButtonListener("backward"),
					false,
					false,
					fullscreenPlacement
				);
			},
			name: "rewindButton",
			remove: async (placement) => {
				await removeFeatureButton("rewindButton", placement);
				eventManager.removeEventListeners("forwardRewindButtons");
			}
		},
		{
			add: async ({ button: { fullscreenPlacement, placement }, time }) => {
				// Get the player element
				const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
				// If player element is not available, return
				if (!playerContainer) return;
				const playerVideoData = await playerContainer.getVideoData();
				// If the video is live return
				if (playerVideoData.isLive) return;
				await addFeatureButton(
					"forwardButton",
					placement,
					window.i18nextInstance.t((translations) => translations.pages.content.features.forwardRewindButtons.buttons.forwardButton.label, {
						TIME: Measure.of(time, seconds).toString()
					}),
					getFeatureIcon("forwardButton", placement),
					() => void speedButtonListener("forward"),
					false,
					false,
					fullscreenPlacement
				);
			},
			name: "forwardButton",
			remove: async (placement) => {
				await removeFeatureButton("forwardButton", placement);
				eventManager.removeEventListeners("forwardRewindButtons");
			}
		}
	],
	dependencies: { includePages: ["watch"] },
	onConfigChange: ({ time }) => {
		updateFeatureButtonTitle(
			"forwardButton",
			window.i18nextInstance.t((translations) => translations.pages.content.features.forwardRewindButtons.buttons.forwardButton.label, {
				TIME: Measure.of(time, seconds).toString()
			})
		);
		updateFeatureButtonTitle(
			"rewindButton",
			window.i18nextInstance.t((translations) => translations.pages.content.features.forwardRewindButtons.buttons.rewindButton.label, {
				TIME: Measure.of(time, seconds).toString()
			})
		);
	}
});
