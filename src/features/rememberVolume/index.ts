import type { YouTubePlayerDiv } from "@/src/types";

import { isLivePage, isShortsPage, isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

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
			options: {
				rememberVolume: { enabled, ...rememberedVolumes }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If the volume is not being remembered, return
	if (!enabled) return;
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
	void setRememberedVolume({
		enableRememberVolume: enabled,
		isShortsPage: IsShortsPage,
		isWatchPage: IsWatchPage || IsLivePage,
		playerContainer,
		rememberedVolumes
	});
	void setupVolumeChangeListener();
}
