import eventManager from "@/src/utils/EventManager";
import { browserColorLog, isShortsPage, isWatchPage, sendContentOnlyMessage, waitForSpecificMessage } from "@/src/utils/utilities";

import type { YouTubePlayerDiv, configuration } from "@/src/@types";
export async function setupVolumeChangeListener() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_remember_last_volume: enableRememberVolume } = options;
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
	if (!playerContainer) return;
	const videoElement: HTMLVideoElement | null = playerContainer.querySelector("div > video");
	if (!videoElement) return;
	eventManager.addEventListener(
		videoElement,
		"volumechange",
		async ({ currentTarget }) => {
			if (!currentTarget) return;
			const newVolume = await playerContainer.getVolume();
			if (IsWatchPage) {
				// Send a "setVolume" message to the content script
				sendContentOnlyMessage("setRememberedVolume", { watchPageVolume: newVolume });
			} else if (IsShortsPage) {
				// Send a "setVolume" message to the content script
				sendContentOnlyMessage("setRememberedVolume", { shortsPageVolume: newVolume });
			}
		},
		"rememberVolume"
	);
}
export async function setRememberedVolume({
	isShortsPage,
	isWatchPage,
	enableRememberVolume,
	rememberedVolumes,
	playerContainer
}: {
	isWatchPage: boolean;
	isShortsPage: boolean;
	rememberedVolumes: configuration["remembered_volumes"];
	enableRememberVolume: boolean;
	playerContainer: YouTubePlayerDiv;
}) {
	// If the remembered volume option is enabled, set the volume and draw the volume display
	if (rememberedVolumes && enableRememberVolume) {
		const { shortsPageVolume, watchPageVolume } = rememberedVolumes ?? {};
		if (isWatchPage && watchPageVolume) {
			// Log the message indicating whether the last volume is being restored or not
			browserColorLog(`Restoring watch page volume to ${watchPageVolume}`, "FgMagenta");
			await playerContainer.setVolume(watchPageVolume);
		} else if (isShortsPage && shortsPageVolume) {
			// Log the message indicating whether the last volume is being restored or not
			browserColorLog(`Restoring shorts page volume to ${shortsPageVolume}`, "FgMagenta");
			await playerContainer.setVolume(shortsPageVolume);
		}
	}
}
