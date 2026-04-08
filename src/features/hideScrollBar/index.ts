import { waitForSpecificMessage } from "@/src/utils/utilities";

import { hideScrollBar } from "./utils";

export async function enableHideScrollBar() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: {
				hideScrollBar: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If the hide scroll bar option is disabled, return
	if (!enabled) return;
	if (document.getElementById("yte-hide-scroll-bar")) return;
	hideScrollBar();
}
