import "./index.css";

import { hidePlayables, showPlayables } from "@/src/features/hidePlayables/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

export function disableHidePlayables() {
	showPlayables();
}
export async function enableHidePlayables() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: {
				hidePlayables: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	hidePlayables();
}
