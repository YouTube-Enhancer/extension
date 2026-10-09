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

const FEATURE_ID = "automaticallyDisableClosedCaptions";

let captionsWhereEnabled = false;
// Attempts in a row that found captions off while the video and its caption track were showing.
let quietAttempts = 0;

async function clickSubtitlesButton() {
	// Get the player element
	const playerContainer = await whenReady("pagePlayer");
	const subtitlesButton = document.querySelector<HTMLElement>("button.ytp-subtitles-button");
	// If player element is not available, return
	if (!playerContainer || !subtitlesButton) return;
	return subtitlesButton;
}

function disableCaptions() {
	// Both describe the video this run is for: what the previous video had must not decide what onDisable restores.
	captionsWhereEnabled = false;
	quietAttempts = 0;
	// A pre-roll ad can run for the better part of a minute; the attempts have to outlast it.
	void registry.playerRetry(
		"automaticallyDisableClosedCaptions",
		[disableCaptionsTask],
		["disableCaptions"],
		{
			interval: 500,
			maxAttempts: 120,
			overallTimeout: 60_000,
			waitForLoaded: true
		}
	);
}

/**
 * Turns captions off once the video is showing and offers them. A single click at enable or navigation time is
 * not enough: during a pre-roll ad the click goes to the ad's player, and YouTube turns captions on from the
 * viewer's preference only after the caption track has loaded, which can be after that click. The run ends once
 * captions were turned off, or once they have stayed off for two attempts after the track loaded, so a caption
 * the viewer turns on later is left alone.
 */
async function disableCaptionsTask(): Promise<boolean> {
	const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	const subtitlesButton = document.querySelector<HTMLButtonElement>("button.ytp-subtitles-button");
	if (!playerContainer || !subtitlesButton) return false;
	if (
		playerContainer.classList.contains("ad-showing") ||
		!(await playerShowsPageVideo(playerContainer)) ||
		!captionsAvailable(playerContainer, subtitlesButton)
	) {
		quietAttempts = 0;
		return false;
	}
	/**
	 * The captions feature the user enabled last owns the captions state. When the
	 * conflicting feature was enabled later, its retry is the one that decides - this
	 * run ends without clicking so its clicks cannot be overridden by this one.
	 */
	if (!isCaptionsConflictArbiter(FEATURE_ID)) return true;
	if (subtitlesButton.getAttribute("aria-pressed") !== "true") {
		quietAttempts += 1;
		return quietAttempts >= 2;
	}
	// Remember that captions were enabled so onDisable can restore them
	captionsWhereEnabled = true;
	subtitlesButton.click();
	// The button reflects a click at once; anything else means YouTube dropped it and the next attempt clicks again.
	return subtitlesButton.getAttribute("aria-pressed") !== "true";
}

export default createFeature({
	...metadata,
	onDisable: async () => {
		// A surviving captions feature (if any) acts again once this one stops owning the state.
		clearCaptionsConflictArbiter(FEATURE_ID);
		// Lifecycle already aborted this feature's player retries before onDisable runs
		const subtitlesButton = await clickSubtitlesButton();
		// If player element is not available, return
		if (!subtitlesButton) return;
		// If captions weren't enabled, return
		if (!captionsWhereEnabled) return;
		// Re-enable captions
		subtitlesButton.click();
	},
	onEnable: async () => {
		// Last-enabled feature owns the captions state; the rival feature's retry stands down.
		markCaptionsConflictArbiter(FEATURE_ID);
		const subtitlesButton = await clickSubtitlesButton();
		// If player element is not available, return
		if (!subtitlesButton) return;
		disableCaptions();
	},
	onNavigate: () => {
		disableCaptions();
	}
});
