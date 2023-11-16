import eventManager, { type FeatureName } from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";

import { addFeatureItemToMenu, getFeatureMenuItem, removeFeatureItemFromMenu } from "../featureMenu/utils";
import { loopButtonClickListener, makeLoopIcon } from "./utils";

export async function addLoopButton() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_loop_button } = options;
	// If the loop button option is disabled, return
	if (!enable_loop_button) return;
	// Get the volume control element
	const volumeControl = document.querySelector("div.ytp-chrome-controls > div.ytp-left-controls > span.ytp-volume-area") as HTMLSpanElement | null;
	// If volume control element is not available, return
	if (!volumeControl) return;
	const videoElement = document.querySelector("video.html5-main-video") as HTMLVideoElement | null;
	if (!videoElement) return;
	const loopSVG = makeLoopIcon();
	addFeatureItemToMenu({
		featureName: "loopButton",
		icon: loopSVG,
		isToggle: true,
		label: `Loop`,
		listener: loopButtonClickListener
	});
	const loopChangedHandler = (mutationList: MutationRecord[]) => {
		for (const mutation of mutationList) {
			if (mutation.type === "attributes") {
				const { attributeName, target } = mutation;
				if (attributeName === "loop") {
					const { loop } = target as HTMLVideoElement;
					const featureName: FeatureName = "loopButton";
					// Get the feature menu
					const featureMenu = document.querySelector("#yte-feature-menu") as HTMLDivElement | null;
					if (!featureMenu) return;

					// Check if the feature item already exists in the menu
					const featureExistsInMenu = featureMenu.querySelector(`#yte-feature-${featureName}`) as HTMLDivElement | null;
					if (featureExistsInMenu) {
						const menuItem = getFeatureMenuItem(featureName);
						if (!menuItem) return;
						menuItem.ariaChecked = loop ? "true" : "false";
					}
				}
			}
		}
	};
	const loopChangeMutationObserver = new MutationObserver(loopChangedHandler);
	loopChangeMutationObserver.observe(videoElement, { attributeFilter: ["loop"], attributes: true });
}
export function removeLoopButton() {
	removeFeatureItemFromMenu("loopButton");
	eventManager.removeEventListeners("loopButton");
}
