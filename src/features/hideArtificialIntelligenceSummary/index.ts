import "./index.css";

import { hideArtificialIntelligenceSummary, showArtificialIntelligenceSummary } from "@/src/features/hideArtificialIntelligenceSummary/utils";
import { waitForSpecificMessage } from "@/src/utils/utilities";

export function disableHideArtificialIntelligenceSummary() {
	showArtificialIntelligenceSummary();
}
export async function enableHideArtificialIntelligenceSummary() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: {
				hideArtificialIntelligenceSummary: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	hideArtificialIntelligenceSummary();
}
