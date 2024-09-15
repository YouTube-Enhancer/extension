import { modifyElementsClassList } from "@/src/utils/utilities";

export function observeOfficialArtistVideosFromHomePage() {
	const observer = new MutationObserver(() => {
		hideOfficialArtistVideosFromHomePage();
	});
	observer.observe(document.body, { childList: true, subtree: true });
	return observer;
}
export function hideOfficialArtistVideosFromHomePage() {
	const officialArtistVideos = document.querySelectorAll<HTMLElement>(
		"ytd-rich-item-renderer:has(#byline-container #channel-name .badge-style-type-verified-artist)"
	);
	modifyElementsClassList(
		"add",
		Array.from(officialArtistVideos).map((element) => ({ className: "yte-hide-official-artist-videos-from-home-page", element }))
	);
}
export function showOfficialArtistVideosFromHomePage() {
	const officialArtistVideos = document.querySelectorAll<HTMLElement>(
		"ytd-rich-item-renderer:has(#byline-container #channel-name .badge-style-type-verified-artist)"
	);
	modifyElementsClassList(
		"remove",
		Array.from(officialArtistVideos).map((element) => ({ className: "yte-hide-official-artist-videos-from-home-page", element }))
	);
}
