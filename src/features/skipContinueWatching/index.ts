import { createFeature } from "@/src/features/_registry/createFeature";
import { browserColorLog } from "@/src/utils/logging";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { metadata } from "./index.metadata";

interface YtdWatchElement extends Element {
	youthereDataChanged_: () => void;
}
let youthereDataChanged_: () => void;
export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch"] },
	onDisable: () => {
		browserColorLog("Disabling skipContinueWatching", "FgMagenta");
		const ytdWatchElement = document.querySelector<YtdWatchElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy");
		if (ytdWatchElement) {
			ytdWatchElement.youthereDataChanged_ = youthereDataChanged_;
		}
	},
	onEnable: () => {
		browserColorLog("Enabling skipContinueWatching", "FgMagenta");
		const ytdWatchElement = document.querySelector<YtdWatchElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy");
		if (ytdWatchElement) {
			({ youthereDataChanged_ } = ytdWatchElement);
			ytdWatchElement.youthereDataChanged_ = function () {};
		}
	}
});
