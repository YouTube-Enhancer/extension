import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { setupAutoScroll } from "@/src/features/shortsAutoScroll/utils";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: () => eventManager.removeEventListeners("shortsAutoScroll"),
	onEnable: async () => {
		// Get the shorts container
		const shortsContainer = await waitForElement<YouTubePlayerDiv>("#shorts-player");
		// If shorts container is not available, return
		if (!shortsContainer) return;
		// Get the video element
		const video = shortsContainer.querySelector<HTMLVideoElement>("video");
		// If video element is not available, return
		if (!video) return;
		// Setup auto scroll
		setupAutoScroll(shortsContainer, video);
	}
});
