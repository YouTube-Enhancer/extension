import { hideMembersOnlyVideos, showMembersOnlyVideos } from "@/src/features/hideMembersOnlyVideos/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export function disableHideMembersOnlyVideos() {
	showMembersOnlyVideos();
}

export async function enableHideMembersOnlyVideos() {
	const {
		data: {
			options: {
				hideMembersOnlyVideos: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	hideMembersOnlyVideos();
}
