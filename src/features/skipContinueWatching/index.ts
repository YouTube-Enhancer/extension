import { browserColorLog, isNewYouTubeVideoLayout, waitForSpecificMessage } from "@/src/utils/utilities";

interface YtdWatchElement extends Element {
	youthereDataChanged_: () => void;
}

export async function enableSkipContinueWatching() {
	const {
		data: {
			options: { enable_skip_continue_watching }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_skip_continue_watching) return;
	browserColorLog("Enabling skipContinueWatching", "FgMagenta");
	const ytdWatchElement = document.querySelector(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy");
	if (ytdWatchElement) {
		(ytdWatchElement as YtdWatchElement).youthereDataChanged_ = function () {};
	}
}
