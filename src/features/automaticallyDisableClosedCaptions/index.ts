import type { YouTubePlayerDiv } from "@/src/types";

import { isLivePage, isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";
let captionsWhereEnabled = false;
export async function disableAutomaticallyDisableClosedCaptions() {
	if (!(isWatchPage() || isLivePage())) return;
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	// If player element is not available, return
	if (!playerContainer) return;
	// If captions weren't enabled, return
	if (!captionsWhereEnabled) return;
	// Re-enable captions
	playerContainer.loadModule("captions");
}
export async function enableAutomaticallyDisableClosedCaptions() {
	if (!(isWatchPage() || isLivePage())) return;
	const {
		data: {
			options: {
				automaticallyDisableClosedCaptions: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	const subtitlesButton = document.querySelector("button.ytp-subtitles-button");
	// If player element is not available, return
	if (!playerContainer || !subtitlesButton) return;
	captionsWhereEnabled = subtitlesButton.getAttribute("aria-pressed") === "true";
	// Disable captions
	playerContainer.unloadModule("captions");
}
