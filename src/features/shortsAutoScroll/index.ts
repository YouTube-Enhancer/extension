import type { YouTubePlayerDiv } from "@/src/types";

import { setupAutoScroll } from "@/src/features/shortsAutoScroll/utils";
import eventManager from "@/src/utils/EventManager";
import { isShortsPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

export async function enableShortsAutoScroll() {
	if (!isShortsPage()) return;
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_shorts_auto_scroll }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If the shorts auto scroll option is disabled, return
	if (!enable_shorts_auto_scroll) return;
	await waitForAllElements(["#shorts-player"]);
	// Get the shorts container
	const shortsContainer = document.querySelector<YouTubePlayerDiv>("#shorts-player");
	// If shorts container is not available, return
	if (!shortsContainer) return;
	// Get the video element
	const video = shortsContainer.querySelector<HTMLVideoElement>("video");
	// If video element is not available, return
	if (!video) return;
	// Setup auto scroll
	setupAutoScroll(shortsContainer, video);
}
export function disableShortsAutoScroll() {
	eventManager.removeEventListeners("shortsAutoScroll");
}
