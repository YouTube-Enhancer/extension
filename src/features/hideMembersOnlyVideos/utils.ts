import { modifyElementClassList } from "@/src/utils/utilities";

export async function hideMembersOnlyVideos() {
	modifyElementClassList("add", {
		className: "yte-hide-members-only-videos",
		element: document.body
	});
}
export async function showMembersOnlyVideos() {
	modifyElementClassList("remove", {
		className: "yte-hide-members-only-videos",
		element: document.body
	});
}
