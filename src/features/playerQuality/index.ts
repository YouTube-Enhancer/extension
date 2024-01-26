import type { YouTubePlayerDiv, YoutubePlayerQualityLevel } from "@/src/types";

import { browserColorLog, chooseClosestQuality, isShortsPage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

/**
 * Sets the player quality based on the options received from a specific message.
 * It automatically sets the quality if the option is enabled and the specified quality is available.
 *
 * @returns {Promise<void>} A promise that resolves once the player quality is set.
 */
export default async function setPlayerQuality(): Promise<void> {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_automatically_set_quality, player_quality }
		}
	} = optionsData;

	// If automatically set quality option is disabled, return
	if (!enable_automatically_set_quality) return;

	// If player quality is not specified, return
	if (!player_quality) return;

	// Get the player element
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null;

	// If player element is not available, return
	if (!playerContainer) return;

	// If setPlaybackQuality method is not available in the player, return
	if (!playerContainer.setPlaybackQuality) return;

	// Get the available quality levels
	const availableQualityLevels = (await playerContainer.getAvailableQualityLevels()) as Exclude<YoutubePlayerQualityLevel, "auto">[];

	// Check if the specified player quality is available
	if (player_quality && player_quality !== "auto") {
		const closestQuality = chooseClosestQuality(player_quality, availableQualityLevels);
		if (!closestQuality) return;
		// Log the message indicating the player quality being set
		browserColorLog(`Setting player quality to ${closestQuality}`, "FgMagenta");

		// Set the playback quality and update the default quality in the dataset
		void playerContainer.setPlaybackQualityRange(closestQuality);
		playerContainer.dataset.defaultQuality = closestQuality;
	}
}
