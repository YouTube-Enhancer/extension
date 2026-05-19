import { isNewYouTubeVideoLayout, isWatchPage } from "@/src/utils/url";

export const getCommentsPanelSelector = () =>
	isNewYouTubeVideoLayout() ?
		"ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-comments-section'] ytd-item-section-renderer[section-identifier='comment-item-section']"
	:	"ytd-comments.ytd-watch-flexy ytd-item-section-renderer[section-identifier='comment-item-section']";
export const playlistItemsSelector = () =>
	isWatchPage() ? "ytd-playlist-panel-renderer:not([hidden]) div#container div#items" : "ytd-playlist-video-list-renderer div#contents";
export const settingsPanelMenuSelector = "div.ytp-settings-menu:not(#yte-feature-menu)";
export const timestampElementSelector = "yt-attributed-string a";
