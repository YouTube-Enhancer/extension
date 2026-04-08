import { modifyElementClassList } from "@/src/utils/utilities";

export function hideMembersOnlyVideos() {
	modifyElementClassList("add", {
		className: "yte-hide-members-only-videos",
		element: document.body
	});
}
export function showMembersOnlyVideos() {
	modifyElementClassList("remove", {
		className: "yte-hide-members-only-videos",
		element: document.body
	});
}
