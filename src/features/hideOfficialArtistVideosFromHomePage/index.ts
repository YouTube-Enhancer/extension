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
			options: {
				hideOfficialArtistVideosFromHomePage: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	hideOfficialArtistVideosFromHomePage();
}
