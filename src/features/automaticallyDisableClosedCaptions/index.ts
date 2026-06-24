import type { YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

let captionsWhereEnabled = false;

async function clickSubtitlesButton() {
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	const subtitlesButton = document.querySelector<HTMLElement>("button.ytp-subtitles-button");
	// If player element is not available, return
	if (!playerContainer || !subtitlesButton) return;
	return subtitlesButton;
}
async function disableCaptions() {
	const subtitlesButton = await clickSubtitlesButton();
	if (!subtitlesButton) return;
	// Disable captions
	subtitlesButton.click();
}
export default createFeature({
	...metadata,
	onDisable: async () => {
		const subtitlesButton = await clickSubtitlesButton();
		// If player element is not available, return
		if (!subtitlesButton) return;
		// If captions weren't enabled, return
		if (!captionsWhereEnabled) return;
		// Re-enable captions
		subtitlesButton.click();
	},
	onEnable: async () => {
		const subtitlesButton = await clickSubtitlesButton();
		// If player element is not available, return
		if (!subtitlesButton) return;
		captionsWhereEnabled = subtitlesButton.getAttribute("aria-pressed") === "true";
		// If captions were already disabled, return
		if (!captionsWhereEnabled) return;
		// Disable captions
		subtitlesButton.click();
	},
	onNavigate: async () => {
		await disableCaptions();
	}
});
