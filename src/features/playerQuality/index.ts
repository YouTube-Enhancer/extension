import { createFeature } from "@/src/features/_registry/createFeature";
import { type Nullable, type YouTubePlayerDiv } from "@/src/types";
import { waitForElement } from "@/src/utils/dom/wait";
import { browserColorLog } from "@/src/utils/logging";
import { chooseClosestQuality } from "@/src/utils/player/quality";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import type { YoutubePlayerQualityLevel } from "./types";

import { metadata } from "./index.metadata";
let currentQuality: Nullable<YoutubePlayerQualityLevel> = null;
export default createFeature({
	...metadata,
	onDisable: async () => {
		if (!currentQuality) return;
		// Get the player element
		const playerContainer =
			isWatchPage() || isLivePage() ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
			: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
			: null;
		// If player element is not available, return
		if (!playerContainer) return;
		// If setPlaybackQuality method is not available in the player, return
		if (!playerContainer.setPlaybackQuality) return;
		await playerContainer.setPlaybackQualityRange(currentQuality);
	},
	onEnable: async ({ fallbackStrategy, quality }) => {
		// Get the player element
		const playerContainer =
			isWatchPage() || isLivePage() ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
			: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
			: null;
		// If player element is not available, return
		if (!playerContainer) return;
		// If setPlaybackQuality method is not available in the player, return
		if (!playerContainer.setPlaybackQuality) return;
		currentQuality = (await playerContainer.getPlaybackQuality()) as YoutubePlayerQualityLevel;
		// Get the available quality levels
		const availableQualityLevels = (await playerContainer.getAvailableQualityLevels()) as YoutubePlayerQualityLevel[];
		// Check if the specified player quality is available
		if (quality && quality !== "auto") {
			const closestQuality = chooseClosestQuality(quality, availableQualityLevels, fallbackStrategy);
			if (!closestQuality) return;
			// Log the message indicating the player quality being set
			browserColorLog(`Setting player quality to ${closestQuality}`, "FgMagenta");
			// Set the playback quality and update the default quality in the dataset
			await playerContainer.setPlaybackQualityRange(closestQuality);
			playerContainer.dataset.defaultQuality = closestQuality;
		}
	}
});
