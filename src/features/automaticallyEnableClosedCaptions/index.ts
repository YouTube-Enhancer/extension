import type { YouTubePlayerDiv } from "@/src/types";

import { isLivePage, isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";
let captionsWhereEnabled = false;
export async function disableAutomaticallyEnableClosedCaptions() {
	if (!(isWatchPage() || isLivePage())) return;
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	// If player element is not available, return
	if (!playerContainer) return;
	// If captions were enabled, return
	if (captionsWhereEnabled) return;
	// Disable captions
	playerContainer.unloadModule("captions");
}
export async function enableAutomaticallyEnableClosedCaptions() {
	if (!(isWatchPage() || isLivePage())) return;
	const {
		data: {
			options: { enable_automatically_enable_closed_captions }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_automatically_enable_closed_captions) return;
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
