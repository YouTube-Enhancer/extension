import eventManager from "@/src/events/EventManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { waitForPagePlayer } from "@/src/utils/dom/pageReadiness";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

const stateAPI = registry.getStateAPI("rememberVolume");

export async function setupVolumeChangeListener() {
	const IsWatchPage = isWatchPage();
	const IsLivePage = isLivePage();
	const IsShortsPage = isShortsPage();
	if (!IsWatchPage && !IsLivePage && !IsShortsPage) return;
	const playerContainer = await waitForPagePlayer();
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
