import type { YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

let captionsWhereEnabled = false;
export default createFeature({
	...metadata,
	onDisable: async () => {
		// Get the player element
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		const subtitlesButton = document.querySelector<HTMLElement>("button.ytp-subtitles-button");
		// If player element is not available, return
		if (!playerContainer || !subtitlesButton) return;
		// If captions weren't enabled, return
		if (!captionsWhereEnabled) return;
		// Re-enable captions
		subtitlesButton.click();
	},
	onEnable: async () => {
		// Get the player element
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		const subtitlesButton = document.querySelector<HTMLElement>("button.ytp-subtitles-button");
		// If player element is not available, return
		if (!playerContainer || !subtitlesButton) return;
		captionsWhereEnabled = subtitlesButton.getAttribute("aria-pressed") === "true";
		// If captions were already disabled, return
		if (!captionsWhereEnabled) return;
		// Disable captions
		subtitlesButton.click();
	}
});
