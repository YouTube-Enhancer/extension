import { modifyElementsClassList, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export async function enableHideEndScreenCards() {
	const {
		data: {
			options: { enable_hide_end_screen_cards: enableHideEndScreenCards }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideEndScreenCards) return;

	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(".ytp-ce-element")).map((element) => ({
			className: "yte-hide-end-screen-cards",
			element
		}))
	);
}

export async function disableHideEndScreenCards() {
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(".ytp-ce-element")).map((element) => ({
			className: "yte-hide-end-screen-cards",
			element
		}))
	);
}
