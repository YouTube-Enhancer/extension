import type { YouTubePlayerDiv } from "@/src/types";

import { isLivePage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

export async function enableAutomaticTheaterMode() {
	if (!isWatchPage()) return;
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_automatic_theater_mode }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If automatic theater mode isn't enabled return
	if (!enable_automatic_theater_mode) return;
	// Get the player element
	const playerContainer = isWatchPage() || isLivePage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player") : null;
	// If player element is not available, return
	if (!playerContainer) return;
	const { width } = await playerContainer.getSize();
	const isTheaterMode = document.body.clientWidth === width;
	// Get the size button
	const sizeButton = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	// If the size button is not available return
	if (!sizeButton) return;
	if (!isTheaterMode) {
		sizeButton.click();
	}
}
