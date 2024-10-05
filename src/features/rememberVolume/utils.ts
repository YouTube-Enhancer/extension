import type { YouTubePlayerDiv, configuration } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { browserColorLog, isLivePage, isShortsPage, isWatchPage, sendContentOnlyMessage, waitForSpecificMessage } from "@/src/utils/utilities";
export async function setupVolumeChangeListener() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_remember_last_volume: enableRememberVolume }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If the volume is not being remembered, return
	if (!enableRememberVolume) return;
	const IsWatchPage = isWatchPage();
	const IsLivePage = isLivePage();
	const IsShortsPage = isShortsPage();
	// Get the player container element
	const playerContainer =
		IsWatchPage || IsLivePage ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: IsShortsPage ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null;
	if (!playerContainer) return;
	const videoElement = playerContainer.querySelector<HTMLVideoElement>("div > video");
	if (!videoElement) return;
	eventManager.addEventListener(
		videoElement,
		"volumechange",
		({ currentTarget }) => {
			void (async () => {
				if (!currentTarget) return;
				const newVolume = await playerContainer.getVolume();
				if (IsWatchPage || IsLivePage) {
					// Send a "setVolume" message to the content script
					sendContentOnlyMessage("setRememberedVolume", { watchPageVolume: newVolume });
				} else if (IsShortsPage) {
					// Send a "setVolume" message to the content script
					sendContentOnlyMessage("setRememberedVolume", { shortsPageVolume: newVolume });
				}
			})();
		},
		"rememberVolume"
	);
}
export async function setRememberedVolume({
	enableRememberVolume,
	isShortsPage,
	isWatchPage,
	playerContainer,
	rememberedVolumes
}: {
	enableRememberVolume: boolean;
	isShortsPage: boolean;
	isWatchPage: boolean;
	playerContainer: YouTubePlayerDiv;
	rememberedVolumes: configuration["remembered_volumes"];
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
