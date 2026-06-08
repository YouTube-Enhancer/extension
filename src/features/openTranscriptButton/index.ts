import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

function transcriptButtonClickerListener() {
	const transcriptButton = document.querySelector<HTMLButtonElement>("ytd-video-description-transcript-section-renderer button");
	if (!transcriptButton) return;
	transcriptButton.click();
}

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				const transcriptButton = await waitForElement("ytd-video-description-transcript-section-renderer button", 150, "optional");
				const transcriptButtonMenuItem = getFeatureButton("openTranscriptButton");
				// If the transcript button is not found and the "openTranscriptButton" menu item exists, remove the transcript button menu item
				if (!transcriptButton && transcriptButtonMenuItem) await removeFeatureButton("openTranscriptButton");
				// If the transcript button isn't found return
				if (!transcriptButton) return;
				// If the transcript button is found and the "openTranscriptButton" menu item does not exist, add the transcript button menu item
				await addFeatureButton(
					"openTranscriptButton",
					placement,
					window.i18nextInstance.t((translations) => translations.pages.content.features.openTranscriptButton.button.label),
					getFeatureIcon("openTranscriptButton", placement),
					transcriptButtonClickerListener,
					false,
					false,
					fullscreenPlacement
				);
			},
			name: "openTranscriptButton",
			remove: async (placement) => {
				await removeFeatureButton("openTranscriptButton", placement);
				eventManager.removeEventListeners("openTranscriptButton");
			},
			shouldRender: async () => {
				const transcriptButton = await waitForElement("ytd-video-description-transcript-section-renderer button", 150, "optional");
				return !!transcriptButton;
			}
		}
	]
});
