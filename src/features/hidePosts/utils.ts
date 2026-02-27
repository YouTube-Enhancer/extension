import { modifyElementClassList } from "@/src/utils/utilities";

export function hidePosts() {
	modifyElementClassList("add", {
		className: "yte-hide-posts",
		element: document.body
	});
}
export function showPosts() {
	modifyElementClassList("remove", {
		className: "yte-hide-posts",
		element: document.body
	});
}
