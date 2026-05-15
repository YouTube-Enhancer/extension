import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement } from "@/src/utils/dom/wait";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { setupVolumeChangeListener } from "./utils";

export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "live", "shorts"] },
	onDisable: () => eventManager.removeEventListeners("rememberVolume"),
	onEnable: async (_, stateAPI) => {
		const { shortsPageVolume, watchPageVolume } = stateAPI.getState();
		const IsWatchPage = isWatchPage();
		const IsLivePage = isLivePage();
		const IsShortsPage = isShortsPage();
		// Get the player container element
		const playerContainer =
			IsWatchPage || IsLivePage ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
			: IsShortsPage ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
			: null;
		// If player container is not available, return
		if (!playerContainer) return;
		// If setVolume method is not available in the player container, return
		if (!playerContainer.setVolume) return;
		if ((IsWatchPage || IsLivePage) && watchPageVolume) {
			await playerContainer.setVolume(watchPageVolume);
		} else if (IsShortsPage && shortsPageVolume) {
			await playerContainer.setVolume(shortsPageVolume);
		}
		await setupVolumeChangeListener();
	},
	state: {
		shortsPageVolume: 25,
		watchPageVolume: 25
	}
});
