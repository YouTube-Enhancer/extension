import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { waitForElement } from "@/src/utils/dom/wait";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";
const stateAPI = registry.stateManager.getStateAPI("rememberVolume");
export async function setupVolumeChangeListener() {
	const IsWatchPage = isWatchPage();
	const IsLivePage = isLivePage();
	const IsShortsPage = isShortsPage();
	// Get the player container element
	const playerContainer =
		IsWatchPage || IsLivePage ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
		: IsShortsPage ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
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
					stateAPI.setState((prev) => ({ ...prev, watchPageVolume: newVolume }));
				} else if (IsShortsPage) {
					stateAPI.setState((prev) => ({ ...prev, shortsPageVolume: newVolume }));
				}
			})();
		},
		"rememberVolume"
	);
}
