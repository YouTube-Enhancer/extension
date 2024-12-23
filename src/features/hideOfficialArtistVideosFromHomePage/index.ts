import type { Nullable } from "@/src/types";
import "./index.css";
import { waitForSpecificMessage } from "@/src/utils/utilities";
import {
	hideOfficialArtistVideosFromHomePage,
	observeOfficialArtistVideosFromHomePage,
	showOfficialArtistVideosFromHomePage
} from "@/src/features/hideOfficialArtistVideosFromHomePage/utils";
let officialArtistVideosObserver: Nullable<MutationObserver> = null;
export async function enableHideOfficialArtistVideosFromHomePage() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_hide_official_artist_videos_from_home_page: enableHideOfficialArtistVideosFromHomePage }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideOfficialArtistVideosFromHomePage) return;
	hideOfficialArtistVideosFromHomePage();
	if (officialArtistVideosObserver) officialArtistVideosObserver.disconnect();
	officialArtistVideosObserver = observeOfficialArtistVideosFromHomePage();
}

export function disableHideOfficialArtistVideosFromHomePage() {
	showOfficialArtistVideosFromHomePage();
	if (officialArtistVideosObserver) {
		officialArtistVideosObserver.disconnect();
		officialArtistVideosObserver = null;
	}
}
