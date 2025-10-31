import { modifyElementsClassList } from "@/src/utils/utilities";

export function hideOfficialArtistVideosFromHomePage() {
	const officialArtistVideos = document.querySelectorAll<HTMLElement>(
		"ytd-rich-item-renderer:has(path[d='M19.222 9.008a3 3 0 010 5.984 3 3 0 01-4.23 4.232 3 3 0 01-5.984 0 3 3 0 01-4.23-4.232 3 3 0 010-5.984 3 3 0 014.23-4.231 3 3 0 015.984 0 3 3 0 014.23 4.231ZM12 7v5.5a2.5 2.5 0 101 2V10h3V7h-4Z'])"
	);
	modifyElementsClassList(
		"add",
		Array.from(officialArtistVideos).map((element) => ({ className: "yte-hide-official-artist-videos-from-home-page", element }))
	);
}
export function observeOfficialArtistVideosFromHomePage() {
	const observer = new MutationObserver(() => {
		hideOfficialArtistVideosFromHomePage();
	});
	observer.observe(document.body, { childList: true, subtree: true });
	return observer;
}
export function showOfficialArtistVideosFromHomePage() {
	const officialArtistVideos = document.querySelectorAll<HTMLElement>(
		"ytd-rich-item-renderer:has(path[d='M19.222 9.008a3 3 0 010 5.984 3 3 0 01-4.23 4.232 3 3 0 01-5.984 0 3 3 0 01-4.23-4.232 3 3 0 010-5.984 3 3 0 014.23-4.231 3 3 0 015.984 0 3 3 0 014.23 4.231ZM12 7v5.5a2.5 2.5 0 101 2V10h3V7h-4Z'])"
	);
	modifyElementsClassList(
		"remove",
		Array.from(officialArtistVideos).map((element) => ({ className: "yte-hide-official-artist-videos-from-home-page", element }))
	);
}
