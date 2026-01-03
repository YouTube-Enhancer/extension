import { modifyElementClassList, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export async function disableHideSidebarRecommendedVideos() {
	modifyElementClassList("remove", {
		className: "yte-hide-sidebar-recommended-videos",
		element: document.body
	});
}

export async function enableHideSidebarRecommendedVideos() {
	const {
		data: {
			options: { enable_hide_sidebar_recommended_videos: enableHideSidebarRecommendedVideos }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideSidebarRecommendedVideos) return;
	modifyElementClassList("add", {
		className: "yte-hide-sidebar-recommended-videos",
		element: document.body
	});
}
