import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { clamp } from "@/src/utils/math";
import { restorePersistedVolume, seedPersistedVolume } from "@/src/utils/player/persistedVolume";
import { isShortsPage } from "@/src/utils/url";

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
 *
 * The seed written in the lifecycle hooks is what makes that backstop quiet: it puts the level in YouTube's
 * store before the player reads it, so the retry below usually confirms a value that is already correct
 * instead of correcting an audible one.
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
	return (await playerContainer.getVolume()) === clamp(volume, 0, 100);
}
function getPlayerContainer(): Nullable<YouTubePlayerDiv> {
	/**
	 * Deliberately not gated to this feature's pages: the document-start seed reaches every YouTube
	 * document, so a /playlist player or a channel trailer can be sitting at our level too, and a
	 * turn-off has to reach it to hand YouTube's own level back. The apply path is unaffected -
	 * playerRetry's `pageTypes` gate keeps `applyVolumeTask` off pages this feature does not serve.
	 */
	const container: Nullable<YouTubePlayerDiv> = document.querySelector<YouTubePlayerDiv>(
		isShortsPage() ? "#shorts-player" : "#movie_player"
	);
	if (!container?.getVolume || !container.setVolume) return null;
	return container;
}
export default createFeature({
	...metadata,
	onConfigChange: async ({ enabled, volume }) => {
		// A volume edit only emits a config change, so apply it the same way onEnable does.
		if (enabled) {
			seedPersistedVolume(volume);
			applyVolume(volume);
			return;
		}
		/**
		 * A turn-off only reaches here with the seed still in place: onEnable/onDisable are gated to
		 * this feature's pages, so disabling while on the home feed never runs onDisable at all.
		 * The store has to be handed back while we still know what was in it - and the live player
		 * with it, since the value captured before our apply is our own level once a seed booted it.
		 */
		const nativeVolume = restorePersistedVolume();
		const playerContainer = getPlayerContainer();
		if (!playerContainer) return;
		await restorePlayerVolume(playerContainer, nativeVolume);
	},
	onDisable: async (config) => {
		// Lifecycle already aborted this feature's player retries before onDisable runs. The store
		// itself is restored by onConfigChange, which always precedes a real disable.
		resetVolumeChangeListener();
		/**
		 * A page-gate exit (watch -> home, watch -> /playlist) also runs this hook with the feature
		 * still configured on, and on a non-gated page `getPlayerContainer()` now finds a live player
		 * that sits at our level because the document seed put it there. Reverting that would hand
		 * native volume to a feature that is still on, so only a real turn-off restores the player.
		 */
		if (config.enabled) return;
		const playerContainer = getPlayerContainer();
		if (!playerContainer) return;
		// No-op when onConfigChange already restored: `originalVolume` is cleared once used.
		await restorePlayerVolume(playerContainer);
	},
	onEnable: ({ volume }) => {
		seedPersistedVolume(volume);
		applyVolume(volume);
	},
	onNavigate: ({ volume }) => {
		seedPersistedVolume(volume);
		applyVolume(volume);
	}
});
