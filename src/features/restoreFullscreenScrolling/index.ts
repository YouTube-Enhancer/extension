import "./index.css";
import { modifyElementsClassList, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";
export async function disableRestoreFullscreenScrolling() {
	await waitForAllElements(["ytd-watch-flexy", "ytd-app", "ytd-app"]);
	modifyElementsClassList("remove", [
		{
			className: "yte-ytd-watch-flexy-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-watch-flexy")
		},
		{
			className: "yte-ytd-app-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-app")
		},
		{
			className: "yte-ytd-app-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-app")
		}
	]);
}
export async function enableRestoreFullscreenScrolling() {
	const {
		data: {
			options: { enable_restore_fullscreen_scrolling }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_restore_fullscreen_scrolling) return;
	await waitForAllElements(["ytd-watch-flexy", "ytd-app", "ytd-app"]);
	modifyElementsClassList("add", [
		{
			className: "yte-ytd-watch-flexy-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-watch-flexy")
		},
		{
			className: "yte-ytd-app-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-app")
		},
		{
			className: "yte-ytd-app-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-app")
		}
	]);
}
