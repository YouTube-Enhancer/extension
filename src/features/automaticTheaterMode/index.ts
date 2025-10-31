import type { YouTubePlayerDiv } from "@/src/types";

import { isLivePage, isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

export async function enableAutomaticTheaterMode() {
	if (!(isWatchPage() || isLivePage())) return;
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_automatic_theater_mode }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If automatic theater mode isn't enabled return
	if (!enable_automatic_theater_mode) return;
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	// If player element is not available, return
	if (!playerContainer) return;
	const { width } = await playerContainer.getSize();
	const {
		body: { clientWidth }
	} = document;
	const isTheaterMode = width === clientWidth;
	// Get the size button
	const sizeButton = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	// If the size button is not available return
	if (!sizeButton) return;
	if (!isTheaterMode) {
		sizeButton.click();
	}
}
