import { getIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import { addFeatureButton, removeFeatureButton } from "../buttonPlacement";

export async function addOpenTranscriptButton() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: {
			options: {
				button_placements: { openTranscriptButton: openTranscriptButtonPlacement }
			}
		}
	} = optionsData;
	function transcriptButtonClickerListener() {
		const transcriptButton = document.querySelector<HTMLButtonElement>("ytd-video-description-transcript-section-renderer button");
		if (!transcriptButton) return;
		transcriptButton.click();
	}
	await addFeatureButton(
		"openTranscriptButton",
		openTranscriptButtonPlacement,
		window.i18nextInstance.t("pages.content.features.openTranscriptButton.label"),
		getIcon("openTranscriptButton", openTranscriptButtonPlacement !== "feature_menu" ? "shared_position_icon" : "feature_menu"),
		transcriptButtonClickerListener,
		false
	);
}
export function removeOpenTranscriptButton() {
	void removeFeatureButton("openTranscriptButton");
	eventManager.removeEventListeners("openTranscriptButton");
}
