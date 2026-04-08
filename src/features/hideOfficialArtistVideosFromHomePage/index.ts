import {
	hideOfficialArtistVideosFromHomePage,
	showOfficialArtistVideosFromHomePage
} from "@/src/features/hideOfficialArtistVideosFromHomePage/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export function disableHideOfficialArtistVideosFromHomePage() {
	showOfficialArtistVideosFromHomePage();
}

export async function enableHideOfficialArtistVideosFromHomePage() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_hide_official_artist_videos_from_home_page: enableHideOfficialArtistVideosFromHomePage }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideOfficialArtistVideosFromHomePage) return;
	hideOfficialArtistVideosFromHomePage();
}
