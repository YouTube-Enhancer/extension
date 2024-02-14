import { hideShorts, observeShortsElements, showShorts } from "@/src/features/hideShorts/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";
let shortsObserver: MutationObserver | null = null;
export async function enableHideShorts() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_hide_shorts }
		}
	} = optionsData;
	// If the hide shorts option is disabled, return
	if (!enable_hide_shorts) return;
	hideShorts();
	// Observe changes to the short sections and hides them
	shortsObserver = observeShortsElements();
}

export function disableHideShorts() {
	showShorts();
	// Disconnect the observer
	if (shortsObserver) {
		shortsObserver.disconnect();
		shortsObserver = null;
	}
}
