import { createFeature } from "@/src/features/_registry/createFeature";
import {
	addFeatureButton,
	getFeatureButton,
	removeFeatureButton
} from "@/src/features/buttonController";
import { getFeatureIcon } from "@/src/icons";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

function transcriptButtonClickerListener() {
	const transcriptButton = document.querySelector<HTMLButtonElement>(
		"ytd-video-description-transcript-section-renderer button"
	);
	if (!transcriptButton) return;
	transcriptButton.click();
}

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				// shouldRender already verified this element exists; do a fast synchronous lookup
				// instead of a second waitForElement (which would duplicate the 150ms timeout).
				const transcriptButton = document.querySelector<HTMLButtonElement>(
					"ytd-video-description-transcript-section-renderer button"
				);
				const transcriptButtonMenuItem = getFeatureButton("openTranscriptButton");
				// If the transcript button is not found and the "openTranscriptButton" menu item exists, remove the transcript button menu item
				if (!transcriptButton && transcriptButtonMenuItem)
					removeFeatureButton("openTranscriptButton");
				// If the transcript button isn't found return
				if (!transcriptButton) return;
				// If the transcript button is found and the "openTranscriptButton" menu item does not exist, add the transcript button menu item
				await addFeatureButton(
					"openTranscriptButton",
					placement,
					window.i18nextInstance.t(
						(translations) => translations.pages.content.features.openTranscriptButton.button.label
					),
					getFeatureIcon("openTranscriptButton", placement),
					transcriptButtonClickerListener,
					false,
					false,
					fullscreenPlacement,
					() =>
						window.i18nextInstance.t(
							(translations) =>
								translations.pages.content.features.openTranscriptButton.button.label
						)
				);
			},
			name: "openTranscriptButton",
			shouldRender: async () => {
				const transcriptButton = await waitForElement(
					"ytd-video-description-transcript-section-renderer button",
					3000,
					"optional"
				);
				return !!transcriptButton;
			}
		}
	]
});
