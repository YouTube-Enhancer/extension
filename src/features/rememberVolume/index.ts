import { isShortsPage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

import { setRememberedVolume, setupVolumeChangeListener } from "./utils";

import type { YouTubePlayerDiv } from "@/src/types";
/**
 * Sets the remembered volume based on the options received from a specific message.
 * It restores the last volume if the option is enabled.
 *
 * @returns {Promise<void>} A promise that resolves once the remembered volume is set.
 */
export default async function enableRememberVolume(): Promise<void> {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { remembered_volumes: rememberedVolumes, enable_remember_last_volume: enableRememberVolume } = options;
	// If the volume is not being remembered, return
	if (!enableRememberVolume) return;
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
	setRememberedVolume({
		enableRememberVolume,
		isShortsPage: IsShortsPage,
		isWatchPage: IsWatchPage,
		playerContainer,
		rememberedVolumes
	});
	setupVolumeChangeListener();
}
