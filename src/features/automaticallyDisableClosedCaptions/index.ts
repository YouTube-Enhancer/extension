import type { YouTubePlayerDiv } from "@/src/types";
import { isLivePage, isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";
let captionsWhereEnabled = false;
export async function enableAutomaticallyDisableClosedCaptions() {
	const {
		data: {
			options: { enable_automatically_disable_closed_captions }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_automatically_disable_closed_captions) return;
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	// Get the player element
	const playerContainer = isWatchPage() || isLivePage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player") : null;
	const subtitlesButton = document.querySelector("button.ytp-subtitles-button");
	// If player element is not available, return
	if (!playerContainer || !subtitlesButton) return;
	captionsWhereEnabled = subtitlesButton.getAttribute("aria-pressed") === "true";
	// Disable captions
	playerContainer.unloadModule("captions");
}
export async function disableAutomaticallyDisableClosedCaptions() {
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	// Get the player element
	const playerContainer = isWatchPage() || isLivePage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player") : null;
	// If player element is not available, return
	if (!playerContainer) return;
	// If captions weren't enabled, return
	if (!captionsWhereEnabled) return;
	// Re-enable captions
	playerContainer.loadModule("captions");
}
