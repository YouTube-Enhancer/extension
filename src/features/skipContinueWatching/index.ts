import { browserColorLog, waitForSpecificMessage } from "@/src/utils/utilities";

interface YtdWatchFlexyElement extends Element {
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
	const ytdWatchFlexyElement = document.querySelector("ytd-watch-flexy");
	if (!ytdWatchFlexyElement) return;
	(ytdWatchFlexyElement as YtdWatchFlexyElement).youthereDataChanged_ = function () {};
}
