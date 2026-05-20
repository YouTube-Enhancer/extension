import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, getFeatureButtonId } from "@/src/features/buttonPlacement/utils";
import { getFeatureIds } from "@/src/features/featureMenu/utils";
import { getFeatureIcon } from "@/src/icons";
import { type SingleButtonFeatureNames } from "@/src/types";

import { metadata } from "./index.metadata";
import { loopButtonClickListener } from "./utils";

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
				const loopChangedHandler = (mutationList: MutationRecord[]) => {
					const loopSVG = getFeatureIcon("loopButton", placement);
					for (const mutation of mutationList) {
						if (mutation.type === "attributes") {
							const { attributeName, target } = mutation;
							if (attributeName === "loop") {
								const { loop } = target as HTMLVideoElement;
								const featureName: SingleButtonFeatureNames = "loopButton";
								// Get the feature menu
								const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
								// Check if the feature item already exists in the menu
								const featureExistsInMenu =
									featureMenu && featureMenu.querySelector<HTMLDivElement>(`#${getFeatureIds(featureName).featureMenuItemId}`) !== null;
								if (featureExistsInMenu) {
									const menuItem = getFeatureButton(featureName);
									if (!menuItem) return;
									menuItem.ariaChecked = loop ? "true" : "false";
								}
								const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(featureName)}`);
								if (!button) return;
								switch (placement) {
									case "below_player":
									case "player_controls_left":
									case "player_controls_right": {
										if (typeof loopSVG === "object" && "off" in loopSVG && "on" in loopSVG) {
											button.firstChild?.replaceWith(loop ? loopSVG.on : loopSVG.off);
										}
										break;
									}
									case "feature_menu": {
										if (loopSVG instanceof SVGSVGElement) {
											button.firstChild?.replaceWith(loopSVG);
										}
										break;
									}
								}
							}
						}
					}
				};
				const loopChangeMutationObserver = new MutationObserver(loopChangedHandler);
				loopChangeMutationObserver.observe(videoElement, { attributeFilter: ["loop"], attributes: true });
			},
			name: "loopButton",
			remove: async (placement) => {
				await removeFeatureButton("loopButton", placement);
				eventManager.removeEventListeners("loopButton");
			}
		}
	],
	dependencies: { includePages: ["watch"] }
});
