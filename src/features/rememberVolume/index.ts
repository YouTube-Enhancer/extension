import type { YouTubePlayerDiv } from "@/src/types";
import { waitForSpecificMessage, isWatchPage, isShortsPage, browserColorLog } from "@/src/utils/utilities";

/**
 * Sets the remembered volume based on the options received from a specific message.
 * It restores the last volume if the option is enabled.
 *
 * @returns {Promise<void>} A promise that resolves once the remembered volume is set.
 */
export default async function setRememberedVolume(): Promise<void> {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { remembered_volumes: rememberedVolume, enable_remember_last_volume: enableRememberVolume } = options;
	const IsWatchPage = isWatchPage();
	const IsShortsPage = isShortsPage();
	// Get the player container element
	const playerContainer = IsWatchPage
		? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
		: IsShortsPage
		? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
		: null;

	// If player container is not available, return
	if (!playerContainer) return;

	// If setVolume method is not available in the player container, return
	if (!playerContainer.setVolume) return;

	// If the remembered volume option is enabled, set the volume and draw the volume display
	if (rememberedVolume && enableRememberVolume) {
		const { shortsPageVolume, watchPageVolume } = rememberedVolume ?? {};
		if (IsWatchPage && watchPageVolume) {
			// Log the message indicating whether the last volume is being restored or not
			browserColorLog(`Restoring watch page volume to ${watchPageVolume}`, "FgMagenta");
			await playerContainer.setVolume(watchPageVolume);
		} else if (IsShortsPage && shortsPageVolume) {
			// Log the message indicating whether the last volume is being restored or not
			browserColorLog(`Restoring shorts page volume to ${shortsPageVolume}`, "FgMagenta");
			await playerContainer.setVolume(shortsPageVolume);
		}
	}
}
