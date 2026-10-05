import type { FeatureStateAPI } from "@/src/features/_registry/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { getPagePlayerElement, waitForPagePlayer } from "@/src/utils/dom/pageReadiness";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { setupVolumeChangeListener } from "./utils";

/**
 * restoreVolume gives up when the player is not ready yet, which on a loaded page leaves the remembered
 * volume unapplied. Re-apply it through the player manager's retry task once the player is up; the volume
 * change listener is already attached by then, so the re-apply records the same value again.
 */
function queueVolumeReapply(stateAPI: FeatureStateAPI<"rememberVolume">): void {
	const task = async () => {
		const { shortsPageVolume, watchPageVolume } = stateAPI.getState();
		const playerContainer = getPagePlayerElement();
		if (!playerContainer?.setVolume) return false;
		if ((isWatchPage() || isLivePage()) && watchPageVolume) {
			await playerContainer.setVolume(watchPageVolume);
		} else if (isShortsPage() && shortsPageVolume) {
			await playerContainer.setVolume(shortsPageVolume);
		}
		return true;
	};
	void registry.executeWithRetries("rememberVolume", [task], ["reapplyVolume"], {
		waitForLoaded: true
	});
}

async function restoreVolume(stateAPI: FeatureStateAPI<"rememberVolume">) {
	const { shortsPageVolume, watchPageVolume } = stateAPI.getState();
	const IsWatchPage = isWatchPage();
	const IsLivePage = isLivePage();
	const IsShortsPage = isShortsPage();
	if (!IsWatchPage && !IsLivePage && !IsShortsPage) return;
	const playerContainer = await waitForPagePlayer();
	// If player container is not available, return
	if (!playerContainer) return;
	// If setVolume method is not available in the player container, return
	if (!playerContainer.setVolume) return;
	if ((IsWatchPage || IsLivePage) && watchPageVolume) {
		await playerContainer.setVolume(watchPageVolume);
	} else if (IsShortsPage && shortsPageVolume) {
		await playerContainer.setVolume(shortsPageVolume);
	}
	await setupVolumeChangeListener();
}

export default createFeature({
	...metadata,
	onDisable: () => eventManager.removeEventListeners("rememberVolume"),
	onEnable: async (_, stateAPI) => {
		await restoreVolume(stateAPI);
		queueVolumeReapply(stateAPI);
	},
	onNavigate: async (_, stateAPI) => {
		await restoreVolume(stateAPI);
		queueVolumeReapply(stateAPI);
	},
	persistState: true,
	state: {
		shortsPageVolume: 25,
		watchPageVolume: 25
	}
});
