import { modifyElementClassList } from "@/src/utils/utilities";
export function hideShorts() {
	modifyElementClassList("add", {
		className: "yte-hide-shorts",
		element: document.body
	});
}

export function showShorts() {
	modifyElementClassList("remove", {
		className: "yte-hide-shorts",
		element: document.body
	});
}
