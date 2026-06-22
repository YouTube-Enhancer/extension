import { isNewYouTubeVideoLayout, isWatchPage } from "@/src/utils/url";

export const CINEMATIC_HEADER_SELECTOR =
	"yt-page-header-renderer yt-page-header-view-model.ytPageHeaderViewModelHost.ytPageHeaderViewModelCinematicContainerOverflowBoundary.ytPageHeaderViewModelDisplayAsSidebar .ytPageHeaderViewModelContent";
export const IMMERSIVE_HEADER_SELECTOR = "ytd-playlist-header-renderer .immersive-header-container .immersive-header-content";
export const NO_PADDING_HEADER_SELECTOR = "yt-page-header-view-model.ytPageHeaderViewModelHost.ytPageHeaderViewModelNoPadding";
export const PLAYLIST_PAGE_HEADER_SELECTORS = [IMMERSIVE_HEADER_SELECTOR, NO_PADDING_HEADER_SELECTOR, CINEMATIC_HEADER_SELECTOR] as const;

export const getCommentsPanelSelector = () =>
	isNewYouTubeVideoLayout() ?
		"ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-comments-section'] ytd-item-section-renderer[section-identifier='comment-item-section']"
	:	"ytd-comments.ytd-watch-flexy ytd-item-section-renderer[section-identifier='comment-item-section']";
export const playlistItemsSelector = () =>
	isWatchPage() ? "ytd-playlist-panel-renderer:not([hidden]) div#container div#items" : "ytd-playlist-video-list-renderer div#contents";
export const selectFirstWithWidth = (...selectors: string[]): HTMLElement | null => {
	for (const selector of selectors) {
		const elements = document.querySelectorAll<HTMLElement>(selector);
		for (const el of elements) {
			if ((el.clientWidth ?? 0) > 0) return el;
		}
	}
	return null;
};

export const settingsPanelMenuSelector = "div.ytp-settings-menu:not(#yte-feature-menu)";
export const timestampElementSelector = "yt-attributed-string a";
