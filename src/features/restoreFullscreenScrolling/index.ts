import { type ElementClassPair, modifyElementsClassList, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export async function disableRestoreFullscreenScrolling() {
	await waitForAllElements(["ytd-watch-flexy", "ytd-app"]);
	modifyElementsClassList("remove", getFullscreenScrollPairs());
}
export async function enableRestoreFullscreenScrolling() {
	const {
		data: {
			options: { enable_restore_fullscreen_scrolling }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_restore_fullscreen_scrolling) return;
	await waitForAllElements(["ytd-watch-flexy", "ytd-app"]);
	modifyElementsClassList("add", getFullscreenScrollPairs());
}
function getFullscreenScrollPairs(): ElementClassPair[] {
	return [
		{
			className: "yte-ytd-watch-flexy-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-watch-flexy")
		},
		{
			className: "yte-ytd-app-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-app")
		}
	];
}
