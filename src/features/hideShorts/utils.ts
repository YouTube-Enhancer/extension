import { modifyElementClassList } from "@/src/utils/utilities";
export async function hideShorts() {
	modifyElementClassList("add", {
		className: "yte-hide-shorts",
		element: document.body
	});
}

export async function showShorts() {
	modifyElementClassList("remove", {
		className: "yte-hide-shorts",
		element: document.body
	});
}
