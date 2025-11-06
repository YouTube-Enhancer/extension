import "./index.css";
import type { Nullable } from "@/src/types";

import {
	hideArtificialIntelligenceSummary,
	observeArtificialIntelligenceSummary,
	showArtificialIntelligenceSummary
} from "@/src/features/hideArtificialIntelligenceSummary/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

let aiSummaryObserver: Nullable<MutationObserver> = null;
export async function disableHideArtificialIntelligenceSummary() {
	await showArtificialIntelligenceSummary();
	// Disconnect the observer
	if (aiSummaryObserver) {
		aiSummaryObserver.disconnect();
		aiSummaryObserver = null;
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
	await hideArtificialIntelligenceSummary();
	if (aiSummaryObserver) aiSummaryObserver.disconnect();
	aiSummaryObserver = await observeArtificialIntelligenceSummary();
}
