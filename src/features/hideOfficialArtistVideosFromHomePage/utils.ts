import { modifyElementClassList } from "@/src/utils/utilities";

export function hideOfficialArtistVideosFromHomePage() {
	modifyElementClassList("add", {
		className: "yte-hide-official-artist-videos-from-home-page",
		element: document.body
	});
}
export function showOfficialArtistVideosFromHomePage() {
	modifyElementClassList("remove", {
		className: "yte-hide-official-artist-videos-from-home-page",
		element: document.body
	});
}
