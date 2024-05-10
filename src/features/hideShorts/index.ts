import { hideShorts, observeShortsElements, showShorts } from "@/src/features/hideShorts/utils";
import { type Nullable } from "@/src/types";
import { waitForSpecificMessage } from "@/src/utils/utilities";
let shortsObserver: Nullable<MutationObserver> = null;
export async function enableHideShorts() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_hide_shorts }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If the hide shorts option is disabled, return
	if (!enable_hide_shorts) return;
	hideShorts();
	// Observe changes to the short sections and hides them
	shortsObserver = observeShortsElements();
}

export function disableHideShorts() {
	showShorts();
	// Disconnect the observer
	shortsObserver?.disconnect();
	shortsObserver = null;
}
