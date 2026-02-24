import { hideMembersOnlyVideos, showMembersOnlyVideos } from "@/src/features/hideMembersOnlyVideos/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export function disableHideMembersOnlyVideos() {
	showMembersOnlyVideos();
}

export async function enableHideMembersOnlyVideos() {
	const {
		data: {
			options: { enable_hide_members_only_videos }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_hide_members_only_videos) return;
	hideMembersOnlyVideos();
}
