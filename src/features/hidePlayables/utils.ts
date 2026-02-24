import { modifyElementClassList } from "@/src/utils/utilities";

export function hidePlayables() {
	modifyElementClassList("add", {
		className: "yte-hide-playables",
		element: document.body
	});
}
export function showPlayables() {
	modifyElementClassList("remove", {
		className: "yte-hide-playables",
		element: document.body
	});
}
