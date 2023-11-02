import { waitForSpecificMessage } from "@/src/utils/utilities";
import { loopButtonClickListener, makeLoopIcon } from "./utils";
import { addFeatureItemToMenu, removeFeatureItemFromMenu } from "../featureMenu/utils";
import eventManager from "@/src/utils/EventManager";

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
		icon: loopSVG,
		label: `Loop`,
		featureName: "loopButton",
		listener: loopButtonClickListener,
		isToggle: true
	});
}
export function removeLoopButton() {
	removeFeatureItemFromMenu("loopButton");
	eventManager.removeEventListeners("loopButton");
}
