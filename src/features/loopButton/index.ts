import { waitForSpecificMessage } from "@/src/utils/utilities";
import { makeLoopOffButton } from "./utils";

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
	const loopButtonExists = document.querySelector("button#yte-loop-button") as HTMLButtonElement | null;
	if (loopButtonExists) return;
	// Get the volume control element
	const volumeControl = document.querySelector("div.ytp-chrome-controls > div.ytp-left-controls > span.ytp-volume-area") as HTMLSpanElement | null;
	// If volume control element is not available, return
	if (!volumeControl) return;
	const loopButton = makeLoopOffButton();
	volumeControl.before(loopButton);
}
export function removeLoopButton() {
	const loopButton = document.querySelector("button#yte-loop-button") as HTMLButtonElement | null;
	if (!loopButton) return;
	loopButton.remove();
}
