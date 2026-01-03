import { hideShorts, showShorts } from "@/src/features/hideShorts/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export async function disableHideShorts() {
	await showShorts();
}

export async function enableHideShorts() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_hide_shorts }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If the hide shorts option is disabled, return
	if (!enable_hide_shorts) return;
	await hideShorts();
}
