import type { YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import {
	captionsAvailable,
	clearCaptionsConflictArbiter,
	isCaptionsConflictArbiter,
	markCaptionsConflictArbiter
} from "@/src/utils/dom/captions";
import { playerShowsPageVideo } from "@/src/utils/dom/player";
import { whenReady } from "@/src/utils/dom/readiness";

import { metadata } from "./index.metadata";

const FEATURE_ID = "automaticallyEnableClosedCaptions";

let captionsWhereEnabled = false;

function enableCaptions() {
	// A pre-roll ad can run for the better part of a minute; the attempts have to outlast it.
	void registry.playerRetry(
		"automaticallyEnableClosedCaptions",
		[enableCaptionsTask],
		["enableCaptions"],
		{
			interval: 500,
			maxAttempts: 120,
			overallTimeout: 60_000,
			waitForLoaded: true
		}
	);
}

/**
 * Turns captions on once the player is showing the video and offers captions. A single click at enable or
 * navigation time is not enough: during a pre-roll ad the click goes to the ad's player, and while no caption
 * track is loaded YouTube drops it, so the task keeps trying until the button reports captions on.
 */
async function enableCaptionsTask(): Promise<boolean> {
	const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	const subtitlesButton = document.querySelector<HTMLButtonElement>("button.ytp-subtitles-button");
	if (!playerContainer || !subtitlesButton) return false;
	if (playerContainer.classList.contains("ad-showing")) return false;
	if (!(await playerShowsPageVideo(playerContainer))) return false;
	if (!captionsAvailable(playerContainer, subtitlesButton)) return false;
	// Captions the video already shows were not this feature's doing, so onDisable has to leave them alone
	if (subtitlesButton.getAttribute("aria-pressed") === "true") {
		captionsWhereEnabled = true;
		return true;
	}
	/**
	 * The captions feature the user enabled last owns the captions state. When the
	 * conflicting feature was enabled later, its retry is the one that decides - this
	 * run ends without clicking so its clicks cannot be overridden by this one.
	 */
	if (!isCaptionsConflictArbiter(FEATURE_ID)) return true;
	// The feature is what turns captions on here, so onDisable has to turn them back off
	captionsWhereEnabled = false;
	subtitlesButton.click();
	// The button reflects a click at once; anything else means YouTube dropped it and the next attempt clicks again.
	return subtitlesButton.getAttribute("aria-pressed") === "true";
}

export default createFeature({
	...metadata,
	onDisable: async () => {
		// A surviving captions feature (if any) acts again once this one stops owning the state.
		clearCaptionsConflictArbiter(FEATURE_ID);
		// Lifecycle already aborted this feature's player retries before onDisable runs
		const playerContainer = await whenReady("pagePlayer");
		// If player element is not available, return
		if (!playerContainer) return;
		// If captions were enabled, return
		if (captionsWhereEnabled) return;
		// Disable captions
		playerContainer.unloadModule("captions");
	},
	onEnable: async () => {
		// Last-enabled feature owns the captions state; the rival feature's retry stands down.
		markCaptionsConflictArbiter(FEATURE_ID);
		// Get the player element
		const playerContainer = await whenReady("pagePlayer");
		const subtitlesButton = document.querySelector<HTMLButtonElement>(
			"button.ytp-subtitles-button"
		);
		// If player element or subtitles button is not available, return
		if (!playerContainer || !subtitlesButton) return;
		captionsWhereEnabled = subtitlesButton.getAttribute("aria-pressed") === "true";
		// If captions were already enabled, return
		if (captionsWhereEnabled) return;
		enableCaptions();
	},
	onNavigate: () => {
		enableCaptions();
	}
});
