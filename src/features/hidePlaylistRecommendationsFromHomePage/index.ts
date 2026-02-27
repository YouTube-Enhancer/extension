import { isHomePage, modifyElementClassList, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export function disableHidePlaylistRecommendationsFromHomePage() {
	showRecommendations();
}

export async function enableHidePlaylistRecommendationsFromHomePage() {
	const {
		data: {
			options: {
				hidePlaylistRecommendationsFromHomePage: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");

	if (!enabled) return;
	if (!isHomePage()) return;
	hideRecommendations();
}

function hideRecommendations() {
	modifyElementClassList("add", {
		className: "yte-hide-playlist-recommendations-from-home-page",
		element: document.body
	});
}

function showRecommendations() {
	modifyElementClassList("remove", {
		className: "yte-hide-playlist-recommendations-from-home-page",
		element: document.body
	});
}
