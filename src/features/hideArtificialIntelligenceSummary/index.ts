import "./index.css";

import { hideArtificialIntelligenceSummary, showArtificialIntelligenceSummary } from "@/src/features/hideArtificialIntelligenceSummary/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

export async function disableHideArtificialIntelligenceSummary() {
	await showArtificialIntelligenceSummary();
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
}
