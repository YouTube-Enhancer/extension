import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import {
	addFeatureButton,
	getFeatureButtonId,
	removeFeatureButton,
	updateFeatureButtonChecked,
	updateFeatureButtonIcon,
	updateFeatureButtonTitle
} from "@/src/features/buttonController";
import { getFeatureIcon } from "@/src/icons";
import { type ButtonPlacement } from "@/src/types";

import { metadata } from "./index.metadata";
import { loopButtonClickListener } from "./utils";

function setupLoopObserver(placement: ButtonPlacement) {
	const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoElement) return;
	const loopChangedHandler = (mutationList: MutationRecord[]) => {
		const loopSVG = getFeatureIcon("loopButton", placement);
		for (const mutation of mutationList) {
			if (mutation.type !== "attributes" || mutation.attributeName !== "loop") continue;
			const { loop } = mutation.target as HTMLVideoElement;
			/**
			 * The loop can change without a click on the button, through YouTube's own Loop menu entry. The
			 * controller keeps aria-checked, the menu item's checked class and the tracked record (which a relocated
			 * button is rebuilt from) in step, so it is told the new state.
			 */
			updateFeatureButtonChecked("loopButton", loop);
			const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId("loopButton")}`);
			if (!button) continue;
			updateFeatureButtonTitle(
				"loopButton",
				window.i18nextInstance.t((translations) => translations.pages.content.features.loopButton.button.toggle[loop ? "on" : "off"])
			);
			if (typeof loopSVG === "object" && "off" in loopSVG && "on" in loopSVG) {
				updateFeatureButtonIcon(button, loop ? loopSVG.on : loopSVG.off);
			}
		}
	};
	const loopChangeMutationObserver = new MutationObserver(loopChangedHandler);
	loopChangeMutationObserver.observe(videoElement, { attributeFilter: ["loop"], attributes: true });
}

export default createFeature({
	...metadata,
	buttons: [
		{
			add: async ({ button: { fullscreenPlacement, placement } }) => {
				const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (!videoElement) return;
				await addFeatureButton(
					"loopButton",
					placement,
					placement === "feature_menu" ?
						window.i18nextInstance.t((translations) => translations.pages.content.features.loopButton.button.label)
					:	window.i18nextInstance.t((translations) => translations.pages.content.features.loopButton.button.toggle.off),
					getFeatureIcon("loopButton", placement),
					loopButtonClickListener,
					true,
					false,
					fullscreenPlacement
				);
				setupLoopObserver(placement);
			},
			name: "loopButton",
			remove: async (placement) => {
				await removeFeatureButton("loopButton", placement);
				eventManager.removeEventListeners("loopButton");
			}
		}
	],
	onNavigate: ({ button: { placement } }) => {
		setupLoopObserver(placement);
	}
});
