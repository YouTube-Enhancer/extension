import { waitForSpecificMessage } from "@/src/utils/utilities";

import { hideScrollBar } from "./utils";

export async function enableHideScrollBar() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_hide_scrollbar }
		}
	} = optionsData;
	if (enable_hide_scrollbar) hideScrollBar();
}
