import type { YouTubePlayerDiv, YoutubePlayerQualityLabel, YoutubePlayerQualityLevel } from "@/src/@types";

import { youtubePlayerQualityLabel, youtubePlayerQualityLevel } from "@/src/@types";
import { browserColorLog, chooseClosetQuality, isShortsPage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

/**
 * Sets the player quality based on the options received from a specific message.
 * It automatically sets the quality if the option is enabled and the specified quality is available.
 *
 * @returns {Promise<void>} A promise that resolves once the player quality is set.
 */
export default async function setPlayerQuality(): Promise<void> {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_automatically_set_quality, player_quality } = options;

	// If automatically set quality option is disabled, return
	if (!enable_automatically_set_quality) return;

	// If player quality is not specified, return
	if (!player_quality) return;

	// Initialize the playerQuality variable
	let playerQuality: YoutubePlayerQualityLabel | YoutubePlayerQualityLevel = player_quality;

	// Get the player element
	const playerContainer = isWatchPage()
		? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
		: isShortsPage()
		  ? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
		  : null;

	// If player element is not available, return
	if (!playerContainer) return;

	// If setPlaybackQuality method is not available in the player, return
	if (!playerContainer.setPlaybackQuality) return;

	// Get the available quality levels
	const availableQualityLevels = (await playerContainer.getAvailableQualityLevels()) as YoutubePlayerQualityLevel[];

	// Check if the specified player quality is available
	if (playerQuality && playerQuality !== "auto") {
		if (!availableQualityLevels.includes(playerQuality)) {
			// Convert the available quality levels to their corresponding labels
			const availableResolutions = availableQualityLevels.reduce(function (array, elem) {
				if (youtubePlayerQualityLabel[youtubePlayerQualityLevel.indexOf(elem)]) {
					array.push(youtubePlayerQualityLabel[youtubePlayerQualityLevel.indexOf(elem)]);
				}
				return array;
			}, [] as YoutubePlayerQualityLabel[]);

			// Choose the closest quality level based on the available resolutions
			playerQuality = chooseClosetQuality(youtubePlayerQualityLabel[youtubePlayerQualityLevel.indexOf(playerQuality)], availableResolutions);

			// If the chosen quality level is not available, return
			if (!youtubePlayerQualityLevel.at(youtubePlayerQualityLabel.indexOf(playerQuality))) return;

			// Update the playerQuality variable
			playerQuality = youtubePlayerQualityLevel.at(youtubePlayerQualityLabel.indexOf(playerQuality)) as YoutubePlayerQualityLevel;
		}

		// Log the message indicating the player quality being set
		browserColorLog(`Setting player quality to ${playerQuality}`, "FgMagenta");

		// Set the playback quality and update the default quality in the dataset
		playerContainer.setPlaybackQualityRange(playerQuality);
		playerContainer.dataset.defaultQuality = playerQuality;
	}
}
