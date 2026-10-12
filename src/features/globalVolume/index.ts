import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import {
	resetVolumeChangeListener,
	restorePlayerVolume,
	setPlayerVolume,
	setupVolumeReassertListener
} from "./utils";

/**
 * Sets the volume once the player has loaded its video and checks that it stuck. A volume set while the player is
 * still starting - a live stream takes noticeably longer than a video - is overwritten by the player's own
 * initialization, which reads YouTube's stored volume back.
 */
function applyVolume(volume: number) {
	void registry.playerRetry("globalVolume", [() => applyVolumeTask(volume)], ["applyVolume"], {
		interval: 500,
		maxAttempts: 6,
		overallTimeout: 15_000,
		pageTypes: ["live", "shorts", "watch"],
		waitForLoaded: true
	});
}
async function applyVolumeTask(volume: number): Promise<boolean> {
	const playerContainer = getPlayerContainer();
	if (!playerContainer) return false;
	// Snapshot the player's own volume before applying: on shorts it tells the re-assert listener whether a
	// later change is YouTube re-applying its persisted volume or a genuine user change.
	const nativeVolume =
		typeof playerContainer.getVolume === "function" ? await playerContainer.getVolume() : null;
	await setPlayerVolume(playerContainer, volume);
	// Attached before the verification so the snapshot is the true pre-write volume even when this
	// attempt's write lands late and the check below fails.
	setupVolumeReassertListener(playerContainer, volume, nativeVolume);
	return (await playerContainer.getVolume()) === Math.max(0, Math.min(volume, 100));
}
function getPlayerContainer(): Nullable<YouTubePlayerDiv> {
	const container: Nullable<YouTubePlayerDiv> =
		isWatchPage() || isLivePage()
			? document.querySelector<YouTubePlayerDiv>("#movie_player")
			: isShortsPage()
				? document.querySelector<YouTubePlayerDiv>("#shorts-player")
				: null;
	if (!container?.getVolume || !container.setVolume) return null;
	return container;
}
export default createFeature({
	...metadata,
	onConfigChange: ({ enabled, volume }) => {
		// A volume edit only emits a config change, so apply it the same way onEnable does.
		if (!enabled) return;
		applyVolume(volume);
	},
	onDisable: async () => {
		// Lifecycle already aborted this feature's player retries before onDisable runs
		resetVolumeChangeListener();
		const playerContainer = getPlayerContainer();
		if (!playerContainer) return;
		await restorePlayerVolume(playerContainer);
	},
	onEnable: ({ volume }) => {
		applyVolume(volume);
	},
	onNavigate: ({ volume }) => {
		applyVolume(volume);
	}
});
