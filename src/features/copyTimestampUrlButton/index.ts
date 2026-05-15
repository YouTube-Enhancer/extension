import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import { type ButtonPlacement } from "@/src/types";
import { createTooltip } from "@/src/utils/dom/tooltip";

import { metadata } from "./index.metadata";

const getCopyTimestampUrlButtonClickListener = (placement: ButtonPlacement) => {
	return () => {
		const videoElement = document.querySelector<HTMLVideoElement>("video");
		if (!videoElement) return;
		const videoId = new URLSearchParams(window.location.search).get("v");
		const timestampUrl = `https://youtu.be/${videoId}?t=${videoElement.currentTime.toFixed()}`;
		void navigator.clipboard.writeText(timestampUrl);
		const button = getFeatureButton("copyTimestampUrlButton");
		if (!button) return;
		const { remove, update } = createTooltip({
			direction: placement === "below_player" ? "down" : "up",
			element: button,
			featureName: "copyTimestampUrlButton",
			id: "yte-feature-copyTimestampUrlButton-tooltip"
		});
		button.dataset.title = window.i18nextInstance.t((translations) => translations.pages.content.features.copyTimestampUrlButton.extras.copied);
		update();
		setTimeout(() => {
			remove();
			button.dataset.title = window.i18nextInstance.t((translations) => translations.pages.content.features.copyTimestampUrlButton.button.label);
			update();
		}, 1000);
	};
};
export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				const copyTimestampUrlButtonClickListener = getCopyTimestampUrlButtonClickListener(placement);
				await addFeatureButton(
					"copyTimestampUrlButton",
					placement,
					window.i18nextInstance.t((translations) => translations.pages.content.features.copyTimestampUrlButton.button.label),
					getFeatureIcon("copyTimestampUrlButton", placement),
					copyTimestampUrlButtonClickListener,
					false,
					false,
					fullscreenPlacement
				);
			},
			name: "copyTimestampUrlButton",
			remove: async (placement) => {
				await removeFeatureButton("copyTimestampUrlButton", placement);
				eventManager.removeEventListeners("copyTimestampUrlButton");
			}
		}
	],
	dependencies: { includePages: ["watch"] }
});
