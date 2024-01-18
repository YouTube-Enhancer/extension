import { waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { removeFeatureButton } from "../buttonPlacement";
import { getFeatureMenuItem } from "../featureMenu/utils";
import { addOpenTranscriptButton } from "./utils";

export async function openTranscriptButton() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: {
			options: { enable_open_transcript_button: enableOpenTranscriptButton }
		}
	} = optionsData;
	// If the open transcript button option is disabled, return
	if (!enableOpenTranscriptButton) return;
	await waitForAllElements(["ytd-video-description-transcript-section-renderer button"]);
	const transcriptButton = document.querySelector("ytd-video-description-transcript-section-renderer button");
	const transcriptButtonMenuItem = getFeatureMenuItem("openTranscriptButton");
	// If the transcript button is not found and the "openTranscriptButton" menu item exists, remove the transcript button menu item
	if (!transcriptButton && transcriptButtonMenuItem) await removeFeatureButton("openTranscriptButton");
	// If the transcript button isn't found return
	if (!transcriptButton) return;
	// If the transcript button is found and the "openTranscriptButton" menu item does not exist, add the transcript button menu item
	void addOpenTranscriptButton();
}
