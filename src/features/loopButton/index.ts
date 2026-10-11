import type { ButtonPlacement, Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import {
	addFeatureButton,
	getFeatureButtonId,
	updateFeatureButtonChecked,
	updateFeatureButtonIcon,
	updateFeatureButtonTitle
} from "@/src/features/buttonController";
import { getFeatureIcon } from "@/src/icons";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";

import { metadata } from "./index.metadata";
import { loopButtonClickListener } from "./utils";

let unsubscribeLoopBus: Nullable<UnsubscribeFromDomMutations> = null;

function setupLoopObserver(placement: ButtonPlacement) {
	unsubscribeLoopBus?.();
	unsubscribeLoopBus = subscribeToDomMutations(
		"video.html5-main-video",
		(elements) => {
			const loopSVG = getFeatureIcon("loopButton", placement);
			for (const element of elements) {
				const { loop } = element as HTMLVideoElement;
				/**
				 * The loop can change without a click on the button, through YouTube's own Loop menu entry. The
				 * controller keeps aria-checked, the menu item's checked class and the tracked record (which a relocated
				 * button is rebuilt from) in step, so it is told the new state.
				 */
				updateFeatureButtonChecked("loopButton", loop);
				const button = document.querySelector<HTMLButtonElement>(
					`#${getFeatureButtonId("loopButton")}`
				);
				if (!button) continue;
				updateFeatureButtonTitle(
					"loopButton",
					window.i18nextInstance.t(
						(translations) =>
							translations.pages.content.features.loopButton.button.toggle[loop ? "on" : "off"]
					)
				);
				if (typeof loopSVG === "object" && "off" in loopSVG && "on" in loopSVG) {
					updateFeatureButtonIcon(button, loop ? loopSVG.on : loopSVG.off);
				}
			}
		},
		{ attributeFilter: ["loop"] }
	);
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
					placement === "feature_menu"
						? window.i18nextInstance.t(
								(translations) => translations.pages.content.features.loopButton.button.label
							)
						: window.i18nextInstance.t(
								(translations) => translations.pages.content.features.loopButton.button.toggle.off
							),
					getFeatureIcon("loopButton", placement),
					loopButtonClickListener,
					true,
					false,
					fullscreenPlacement,
					() => {
						const looping =
							document.querySelector<HTMLVideoElement>("video.html5-main-video")?.loop ?? false;
						return placement === "feature_menu"
							? window.i18nextInstance.t(
									(translations) => translations.pages.content.features.loopButton.button.label
								)
							: window.i18nextInstance.t(
									(translations) =>
										translations.pages.content.features.loopButton.button.toggle[
											looping ? "on" : "off"
										]
								);
					}
				);
				setupLoopObserver(placement);
			},
			name: "loopButton"
		}
	],
	onDisable: () => {
		unsubscribeLoopBus?.();
		unsubscribeLoopBus = null;
	},
	onNavigate: ({ button: { placement } }) => {
		setupLoopObserver(placement);
	}
});
