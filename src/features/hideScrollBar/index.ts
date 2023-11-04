import { waitForSpecificMessage } from "@/src/utils/utilities";
import { hideScrollBar } from "./utils";

export async function enableHideScrollBar() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_hide_scroll_bar } = options;
	// If the hide scroll bar option is disabled, return
	if (!enable_hide_scroll_bar) return;
	hideScrollBar();
}
