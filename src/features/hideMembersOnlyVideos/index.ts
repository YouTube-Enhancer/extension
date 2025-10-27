import type { Nullable } from "@/src/types";

import "./index.css";
import { hideMembersOnlyVideos, observeMembersOnlyVideosElements, showMembersOnlyVideos } from "@/src/features/hideMembersOnlyVideos/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

let membersOnlyVideosObserver: Nullable<{ disconnect: () => void; observer: MutationObserver }> = null;
export async function disableHideMembersOnlyVideos() {
	await showMembersOnlyVideos();
	if (!membersOnlyVideosObserver) return;
	membersOnlyVideosObserver.disconnect();
	membersOnlyVideosObserver = null;
}

export async function enableHideMembersOnlyVideos() {
	const {
		data: {
			options: { enable_hide_members_only_videos }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_hide_members_only_videos) return;
	await hideMembersOnlyVideos();
	membersOnlyVideosObserver = observeMembersOnlyVideosElements();
}
