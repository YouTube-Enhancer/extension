import "./index.css";

import { hidePlayables, showPlayables } from "@/src/features/hidePlayables/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

export async function disableHidePlayables() {
	await showPlayables();
}
export async function enableHidePlayables() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_hide_playables: enableHidePlayables }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHidePlayables) return;
	await hidePlayables();
}
