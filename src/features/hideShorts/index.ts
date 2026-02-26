import { applyShortsVisibility } from "@/src/features/hideShorts/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export function disableHideShorts(): void {
	applyShortsVisibility({
		channel: false,
		home: false,
		search: false,
		sidebar: false,
		videos: false
	});
}
export async function enableHideShorts(): Promise<void> {
	const {
		data: {
			options: {
				enable_hide_shorts_channel,
				enable_hide_shorts_home,
				enable_hide_shorts_search,
				enable_hide_shorts_sidebar,
				enable_hide_shorts_videos
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	applyShortsVisibility({
		channel: enable_hide_shorts_channel,
		home: enable_hide_shorts_home,
		search: enable_hide_shorts_search,
		sidebar: enable_hide_shorts_sidebar,
		videos: enable_hide_shorts_videos
	});
}
