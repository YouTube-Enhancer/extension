import { hideMoreVideosOnEndScreen, showMoreVideosOnEndScreen } from "@/src/features/automaticallyShowMoreVideosOnEndScreen/utils";

import "./index.css";
import { waitForSpecificMessage } from "@/src/utils/utilities";

export function disableAutomaticallyShowMoreVideosOnEndScreen() {
	hideMoreVideosOnEndScreen();
}
export async function enableAutomaticallyShowMoreVideosOnEndScreen() {
	const {
		data: {
			options: { enable_automatically_show_more_videos_on_end_screen }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_automatically_show_more_videos_on_end_screen) return;
	showMoreVideosOnEndScreen();
}
