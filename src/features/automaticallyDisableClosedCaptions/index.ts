import type { YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { captionsAvailable } from "@/src/utils/dom/captions";
import { playerShowsPageVideo } from "@/src/utils/dom/player";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

let captionsWhereEnabled = false;
// Attempts in a row that found captions off while the video and its caption track were showing.
let quietAttempts = 0;

async function clickSubtitlesButton() {
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
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
	void registry.playerManager.executeWithRetries("automaticallyDisableClosedCaptions", [disableCaptionsTask], ["disableCaptions"], {
		interval: 500,
		maxAttempts: 120,
		overallTimeout: 60_000,
		waitForLoaded: true
	});
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
		// A run still watching captions must not turn them off after the feature is off
		registry.playerManager.cleanup("automaticallyDisableClosedCaptions");
		const subtitlesButton = await clickSubtitlesButton();
		// If player element is not available, return
		if (!subtitlesButton) return;
		// If captions weren't enabled, return
		if (!captionsWhereEnabled) return;
		// Re-enable captions
		subtitlesButton.click();
	},
	onEnable: async () => {
		const subtitlesButton = await clickSubtitlesButton();
		// If player element is not available, return
		if (!subtitlesButton) return;
		disableCaptions();
	},
	onNavigate: () => {
		disableCaptions();
	}
});
