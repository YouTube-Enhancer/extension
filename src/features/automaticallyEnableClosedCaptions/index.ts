import type { YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

let captionsWhereEnabled = false;
export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "live"] },
	onDisable: async () => {
		// Get the player element
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		// If player element is not available, return
		if (!playerContainer) return;
		// If captions were enabled, return
		if (captionsWhereEnabled) return;
		// Disable captions
		playerContainer.unloadModule("captions");
	},
	onEnable: async () => {
		// Get the player element
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		const subtitlesButton = document.querySelector<HTMLButtonElement>("button.ytp-subtitles-button");
		// If player element or subtitles button is not available, return
		if (!playerContainer || !subtitlesButton) return;
		captionsWhereEnabled = subtitlesButton.getAttribute("aria-pressed") === "true";
		// If captions were already enabled, return
		if (captionsWhereEnabled) return;
		// Enable captions
		subtitlesButton.click();
	}
});
