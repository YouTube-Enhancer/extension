import { hideMoreVideosOnEndScreen, showMoreVideosOnEndScreen } from "@/src/features/automaticallyShowMoreVideosOnEndScreen/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export function disableAutomaticallyShowMoreVideosOnEndScreen() {
	hideMoreVideosOnEndScreen();
}
export async function enableAutomaticallyShowMoreVideosOnEndScreen() {
	const {
		data: {
			options: {
				automaticallyShowMoreVideosOnEndScreen: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	showMoreVideosOnEndScreen();
}
