import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { browserColorLog } from "@/src/utils/logging";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { metadata } from "./index.metadata";

interface YtdWatchElement extends Element {
	youthereDataChanged_: () => void;
}
let youthereDataChanged_: (() => void) | undefined;

function getWatchElement(): Nullable<YtdWatchElement> {
	return document.querySelector<YtdWatchElement>(
		isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy"
	);
}

function patchContinueWatching(): boolean {
	const ytdWatchElement = getWatchElement();
	if (!ytdWatchElement) return false;
	// YouTube upgrades ytd-watch-flexy after setup on slow loads, and the upgrade
	// assignment overwrites the no-op patch with the real handler. A retry that
	// finds the real handler captures it, so disable can still restore it.
	if (
		youthereDataChanged_ === undefined &&
		typeof ytdWatchElement.youthereDataChanged_ === "function"
	) {
		({ youthereDataChanged_ } = ytdWatchElement);
	}
	ytdWatchElement.youthereDataChanged_ = function () {};
	return true;
}

export default createFeature({
	...metadata,
	onDisable: () => {
		browserColorLog("Disabling skipContinueWatching", "FgMagenta");
		registry.playerManager.cleanup("skipContinueWatching");
		const ytdWatchElement = getWatchElement();
		if (ytdWatchElement && youthereDataChanged_) {
			ytdWatchElement.youthereDataChanged_ = youthereDataChanged_;
		}
	},
	onEnable: () => {
		browserColorLog("Enabling skipContinueWatching", "FgMagenta");
		// Apply the patch through the player manager's retry task: by the time the
		// player has loaded, the element upgrade has run, the capture sees the real
		// handler, and the patch sticks instead of being clobbered.
		void registry.playerManager.executeWithRetries(
			"skipContinueWatching",
			[patchContinueWatching],
			["patch-continue-watching"],
			{ pageTypes: ["watch"], waitForLoaded: true }
		);
	},
	onNavigate: () => {
		patchContinueWatching();
	}
});
