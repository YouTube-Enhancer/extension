import { modifyElementClassList, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export function disableHideSidebarRecommendedVideos() {
	modifyElementClassList("remove", {
		className: "yte-hide-sidebar-recommended-videos",
		element: document.body
	});
}

export async function enableHideSidebarRecommendedVideos() {
	const {
		data: {
			options: {
				hideSidebarRecommendedVideos: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	modifyElementClassList("add", {
		className: "yte-hide-sidebar-recommended-videos",
		element: document.body
	});
}
