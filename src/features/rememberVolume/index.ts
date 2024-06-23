import type { YouTubePlayerDiv } from "@/src/types";

import { isShortsPage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

import { setRememberedVolume, setupVolumeChangeListener } from "./utils";

/**
 * Sets the remembered volume based on the options received from a specific message.
 * It restores the last volume if the option is enabled.
 *
 * @returns {Promise<void>} A promise that resolves once the remembered volume is set.
 */
export default async function enableRememberVolume(): Promise<void> {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_remember_last_volume: enableRememberVolume, remembered_volumes: rememberedVolumes }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If the volume is not being remembered, return
	if (!enableRememberVolume) return;
	const IsWatchPage = isWatchPage();
	const IsShortsPage = isShortsPage();
	// Get the player container element
	const playerContainer =
		IsWatchPage ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: IsShortsPage ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null;

	// If player container is not available, return
	if (!playerContainer) return;

	// If setVolume method is not available in the player container, return
	if (!playerContainer.setVolume) return;
	void setRememberedVolume({
		enableRememberVolume,
		isShortsPage: IsShortsPage,
		isWatchPage: IsWatchPage,
		playerContainer,
		rememberedVolumes
	});
	void setupVolumeChangeListener();
}
