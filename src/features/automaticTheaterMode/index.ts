import type { YouTubePlayerDiv } from "@/src/types";

import { isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

export async function automaticTheaterMode() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_automatic_theater_mode }
		}
	} = optionsData;
	// If automatic theater mode isn't enabled return
	if (!enable_automatic_theater_mode) return;
	if (!isWatchPage()) return;
	// Get the player element
	const playerContainer = isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player") : null;
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
