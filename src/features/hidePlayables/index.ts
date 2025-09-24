import "./index.css";
import type { Nullable } from "@/src/types";

import { hidePlayables, observePlayables, showPlayables } from "@/src/features/hidePlayables/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

let playablesObserver: Nullable<MutationObserver> = null;
export async function disableHidePlayables() {
	await showPlayables();
	// Disconnect the observer
	if (playablesObserver) {
		playablesObserver.disconnect();
		playablesObserver = null;
	}
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
	if (playablesObserver) playablesObserver.disconnect();
	playablesObserver = observePlayables();
}
