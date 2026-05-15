import { modifyElementClassList } from "@/src/utils/dom/classList";

export function hideMoreVideosOnEndScreen() {
	modifyElementClassList("remove", {
		className: "yte-hide-ytp-fullscreen-grid",
		element: document.body
	});
	modifyElementClassList("remove", {
		className: "yte-show-html5-endscreen",
		element: document.body
	});
}

export function showMoreVideosOnEndScreen() {
	modifyElementClassList("add", {
		className: "yte-hide-ytp-fullscreen-grid",
		element: document.body
	});
	modifyElementClassList("add", {
		className: "yte-show-html5-endscreen",
		element: document.body
	});
}
