import { Measure, seconds } from "safe-units";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, getFeatureButton, removeFeatureButton, updateFeatureButtonTitle } from "@/src/features/buttonController";
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
				// Only this button's listeners may go: the feature's other button can already have been re-added
				// with fresh listeners registered under the same feature name.
				const button = getFeatureButton("rewindButton");
				await removeFeatureButton("rewindButton", placement);
				if (button) eventManager.removeEventListenersForTarget(button, "forwardRewindButtons");
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
				// Only this button's listeners may go: the feature's other button can already have been re-added
				// with fresh listeners registered under the same feature name.
				const button = getFeatureButton("forwardButton");
				await removeFeatureButton("forwardButton", placement);
				if (button) eventManager.removeEventListenersForTarget(button, "forwardRewindButtons");
			}
		}
	],
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
