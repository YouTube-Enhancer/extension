import { getIcon } from "@/src/icons";
import eventManager, { type FeatureName } from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import { addFeatureButton, removeFeatureButton } from "../buttonPlacement";
import { getFeatureIds, getFeatureMenuItem } from "../featureMenu/utils";
import { loopButtonClickListener } from "./utils";

export async function addLoopButton() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
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

	const loopSVG = getIcon("loopButton", loopButtonPlacement !== "feature_menu" ? "shared_position_icon" : "feature_menu");
	// TODO: fix icon positioning
	await addFeatureButton(
		"loopButton",
		loopButtonPlacement,
		window.i18nextInstance.t("pages.content.features.loopButton.label"),
		loopSVG,
		loopButtonClickListener,
		true
	);
	const loopChangedHandler = (mutationList: MutationRecord[]) => {
		for (const mutation of mutationList) {
			if (mutation.type === "attributes") {
				const { attributeName, target } = mutation;
				if (attributeName === "loop") {
					const { loop } = target as HTMLVideoElement;
					const featureName: FeatureName = "loopButton";
					// Get the feature menu
					const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
					// Check if the feature item already exists in the menu
					const featureExistsInMenu =
						featureMenu && featureMenu.querySelector<HTMLDivElement>(`#${getFeatureIds(featureName).featureMenuItemId}`) !== null;
					if (featureExistsInMenu) {
						const menuItem = getFeatureMenuItem(featureName);
						if (!menuItem) return;
						menuItem.ariaChecked = loop ? "true" : "false";
					}
					const button = document.querySelector<HTMLButtonElement>(`#yte-feature-${featureName}-button`);
					if (!button) return;
					button.firstChild?.remove();
					switch (loopButtonPlacement) {
						case "feature_menu": {
							if (loopSVG instanceof SVGSVGElement) {
								button.appendChild(loopSVG);
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
}
export function removeLoopButton() {
	void removeFeatureButton("loopButton");
	eventManager.removeEventListeners("loopButton");
}
