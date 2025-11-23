import "./index.css";
import { modifyElementClassList, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

const sidebarRecommendedVideosSelector = "#secondary #secondary-inner #related";
export async function disableHideSidebarRecommendedVideos() {
	modifyElementClassList("remove", {
		className: "yte-hide-sidebar-recommended-videos",
		element: document.querySelector(sidebarRecommendedVideosSelector)
	});
}

export async function enableHideSidebarRecommendedVideos() {
	const {
		data: {
			options: { enable_hide_sidebar_recommended_videos: enableHideSidebarRecommendedVideos }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideSidebarRecommendedVideos) return;
	await waitForElement(sidebarRecommendedVideosSelector);
	modifyElementClassList("add", {
		className: "yte-hide-sidebar-recommended-videos",
		element: document.querySelector(sidebarRecommendedVideosSelector)
	});
}
