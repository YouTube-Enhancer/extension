import { modifyElementClassList } from "@/src/utils/utilities";

export async function hidePlayables() {
	modifyElementClassList("add", {
		className: "yte-hide-playables",
		element: document.body
	});
}
export async function showPlayables() {
	modifyElementClassList("remove", {
		className: "yte-hide-playables",
		element: document.body
	});
}
