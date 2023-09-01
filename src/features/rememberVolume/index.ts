import { YouTubePlayerDiv } from "@/src/types";
import { waitForSpecificMessage, isWatchPage, isShortsPage, browserColorLog } from "@/src/utils/utilities";

/**
 * Sets the remembered volume based on the options received from a specific message.
 * It restores the last volume if the option is enabled.
 *
 * @returns {Promise<void>} A promise that resolves once the remembered volume is set.
 */
export default async function setRememberedVolume(): Promise<void> {
	// Wait for the "options" message from the content script
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });

	// If options are not available, return
	if (!options) return;

	// Extract the necessary properties from the options object
	const { remembered_volume: rememberedVolume, enable_remember_last_volume: enableRememberVolume } = options;

	// Get the player container element
	const playerContainer = isWatchPage()
		? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
		: isShortsPage()
		? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
		: null;

	// If player container is not available, return
	if (!playerContainer) return;

	// If setVolume method is not available in the player container, return
	if (!playerContainer.setVolume) return;

	// Log the message indicating whether the last volume is being restored or not
	browserColorLog(`${enableRememberVolume ? "Restoring" : "Not restoring"} last volume ${rememberedVolume}`, "FgMagenta");

	// If the remembered volume option is enabled, set the volume and draw the volume display
	if (rememberedVolume && enableRememberVolume) {
		await playerContainer.setVolume(rememberedVolume);
	}
}
