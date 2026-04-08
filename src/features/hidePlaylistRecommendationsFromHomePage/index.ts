import { isHomePage, modifyElementClassList, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export function disableHidePlaylistRecommendationsFromHomePage() {
	showRecommendations();
}

export async function enableHidePlaylistRecommendationsFromHomePage() {
	const {
		data: {
			options: { enable_hide_playlist_recommendations_from_home_page }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");

	if (!enable_hide_playlist_recommendations_from_home_page) return;
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
