import type { SingleButtonFeatureNames } from "@/src/types";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton, getFeatureButtonId } from "@/src/features/buttonPlacement/utils";
import { getFeatureIds } from "@/src/features/featureMenu/utils";
import { getFeatureIcon } from "@/src/icons";
import eventManager, { type FeatureName } from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import type { AddButtonFunction, RemoveButtonFunction } from "../index";

import { loopButtonClickListener } from "./utils";

export const addLoopButton: AddButtonFunction = async () => {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: {
				button_placements: { loopButton: loopButtonPlacement },
				enable_loop_button
			}
		}
	} = optionsData;
	// If the loop button option is disabled, return
	if (!enable_loop_button) return;
	// Get the volume control element
	const volumeControl = document.querySelector<HTMLSpanElement>("div.ytp-chrome-controls > div.ytp-left-controls > span.ytp-volume-area");
	// If volume control element is not available, return
	if (!volumeControl) return;
	const videoElement = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoElement) return;

	await addFeatureButton(
		"loopButton",
		loopButtonPlacement,
		loopButtonPlacement === "feature_menu" ?
			window.i18nextInstance.t("pages.content.features.loopButton.button.label")
		:	window.i18nextInstance.t("pages.content.features.loopButton.button.toggle.off"),
		getFeatureIcon("loopButton", loopButtonPlacement !== "feature_menu" ? "shared_icon_position" : "feature_menu"),
		loopButtonClickListener,
		true
	);
	const loopChangedHandler = (mutationList: MutationRecord[]) => {
		const loopSVG = getFeatureIcon("loopButton", loopButtonPlacement !== "feature_menu" ? "shared_icon_position" : "feature_menu");
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
					switch (loopButtonPlacement) {
						case "feature_menu": {
							if (loopSVG instanceof SVGSVGElement) {
								button.firstChild?.replaceWith(loopSVG);
							}
							break;
						}
						case "below_player":
						case "player_controls_left":
						case "player_controls_right": {
							if (typeof loopSVG === "object" && "off" in loopSVG && "on" in loopSVG) {
								button.firstChild?.replaceWith(loop ? loopSVG.on : loopSVG.off);
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
};
export const removeLoopButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("loopButton", placement);
	eventManager.removeEventListeners("loopButton");
};
