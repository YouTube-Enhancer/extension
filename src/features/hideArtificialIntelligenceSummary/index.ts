import type { Nullable } from "@/src/types";

import {
	hideArtificialIntelligenceSummary,
	observeArtificialIntelligenceSummary,
	showArtificialIntelligenceSummary
} from "@/src/features/hideArtificialIntelligenceSummary/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

let playablesObserver: Nullable<MutationObserver> = null;
export function disableHideArtificialIntelligenceSummary() {
	showArtificialIntelligenceSummary();
	// Disconnect the observer
	if (playablesObserver) {
		playablesObserver.disconnect();
		playablesObserver = null;
	}
}
export async function enableHideArtificialIntelligenceSummary() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_hide_artificial_intelligence_summary: enableHideArtificialIntelligenceSummary }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideArtificialIntelligenceSummary) return;
	hideArtificialIntelligenceSummary();
	if (playablesObserver) playablesObserver.disconnect();
	playablesObserver = observeArtificialIntelligenceSummary();
}
