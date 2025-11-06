import { modifyElementClassList } from "@/src/utils/utilities";

export function hideMoreVideosOnEndScreen() {
	modifyElementClassList("remove", {
		className: "yte-hide-ytp-fullscreen-grid",
		element: document.querySelector("div.ytp-fullscreen-grid")
	});
	modifyElementClassList("remove", {
		className: "yte-show-html5-endscreen",
		element: document.querySelector("div.html5-endscreen")
	});
}

export function showMoreVideosOnEndScreen() {
	modifyElementClassList("add", {
		className: "yte-hide-ytp-fullscreen-grid",
		element: document.querySelector("div.ytp-fullscreen-grid")
	});
	modifyElementClassList("add", {
		className: "yte-show-html5-endscreen",
		element: document.querySelector("div.html5-endscreen")
	});
}
