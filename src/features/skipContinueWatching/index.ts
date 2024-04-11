import { browserColorLog, waitForSpecificMessage } from "@/src/utils/utilities";

interface YtdWatchFlexyElement extends Element {
	youthereDataChanged_: () => void;
}

export async function enableSkipContinueWatching() {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_skip_continue_watching }
		}
	} = optionsData;
	if (!enable_skip_continue_watching) return;
	browserColorLog("Enabling skipContinueWatching", "FgMagenta");
	const ytdWatchFlexyElement = document.querySelector("ytd-watch-flexy");
	if (ytdWatchFlexyElement) {
		(ytdWatchFlexyElement as YtdWatchFlexyElement).youthereDataChanged_ = function () {};
	}
}
