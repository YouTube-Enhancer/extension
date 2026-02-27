import { hidePosts, showPosts } from "@/src/features/hidePosts/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export function disableHidePosts() {
	showPosts();
}
export async function enableHidePosts() {
	const {
		data: {
			options: {
				hidePosts: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	hidePosts();
}
