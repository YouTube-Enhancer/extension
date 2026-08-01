import type { Nullable } from "@/src/types";

import { createSVGElement } from "@/src/utils/dom/elements";
import { PLAYLIST_PAGE_HEADER_SELECTORS, selectFirstWithWidth } from "@/src/utils/dom/selectors";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

export interface AutoplayData {
	[key: string]: unknown;
	sets: AutoplaySet[];
}
export interface AutoplaySet {
	[key: string]: unknown;
	autoplayVideo: Record<string, unknown>;
	nextButtonVideo: Record<string, unknown>;
	previousButtonVideo: Record<string, unknown>;
}
export interface BrowseElement extends HTMLElement {
	data?: Record<string, unknown>;
}
export interface ManagerElement extends HTMLElement {
	autoplayData?: AutoplayData;
	setPlaylistData?(data: PlaylistData): void;
}
export interface PanelElement extends HTMLElement {
	data?: PlaylistData;
	updateData?(data: PlaylistData): void;
}
export interface PlaylistContentsItem {
	[key: string]: unknown;
	playlistPanelVideoRenderer?: PlaylistItemRenderer;
	playlistVideoRenderer?: PlaylistItemRenderer;
}
export interface PlaylistData {
	[key: string]: unknown;
	contents: PlaylistContentsItem[];
	currentIndex: number;
	localCurrentIndex: number;
	totalVideos: number;
}
export interface PlaylistItemRenderer {
	navigationEndpoint?: { watchEndpoint?: { index?: number } };
}
export interface PlaylistPageDataContents {
	contents?: {
		twoColumnBrowseResultsRenderer?: {
			tabs?: Array<{
				tabRenderer?: {
					content?: {
						sectionListRenderer?: {
							contents?: Array<{
								itemSectionRenderer?: {
									contents?: Array<{
										playlistVideoListRenderer?: {
											contents?: PlaylistContentsItem[];
										};
									}>;
								};
							}>;
						};
					};
				};
			}>;
		};
	};
}
export interface WatchFlexyData {
	contents?: { twoColumnWatchNextResults?: { autoplay?: { autoplay?: AutoplayData }; playlist?: { playlist?: PlaylistData } } };
}
export interface WatchFlexyElement extends HTMLElement {
	data?: WatchFlexyData;
	updatePageData_?(data: unknown): void;
}
export interface YtdPlayerElement extends HTMLElement {
	updatePlayerComponents?(...args: unknown[]): void;
	updatePlayerPlaylist_?(playlist: PlaylistData): void;
}

export function createReverseIcon() {
	return createSVGElement(
		"svg",
		{
			fill: "none",
			height: "24px",
			stroke: "currentColor",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			"stroke-width": "2",
			viewBox: "0 0 24 24",
			width: "24px"
		},
		createSVGElement("path", {
			d: "M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
		})
	);
}

export function getHeaderSelector(): string {
	return isNewYouTubeVideoLayout() ?
			"#page-manager > ytd-watch-grid #playlist #start-actions"
		:	"#page-manager > ytd-watch-flexy #playlist #start-actions";
}

export function getPlaylistData(): Nullable<{ autoplay: AutoplayData; playlist: PlaylistData; watchFlexy: WatchFlexyElement }> {
	const watchFlexy = document.querySelector<WatchFlexyElement>("ytd-watch-flexy, ytd-watch-grid");
	if (!watchFlexy) return null;
	const { data } = watchFlexy;
	if (!data?.contents?.twoColumnWatchNextResults) return null;
	const playlist = data.contents.twoColumnWatchNextResults.playlist?.playlist;
	const autoplay = data.contents.twoColumnWatchNextResults.autoplay?.autoplay;
	if (!playlist?.contents || !autoplay?.sets) return null;
	return { autoplay, playlist, watchFlexy };
}

export function getPlaylistPageData(): Nullable<{ browse: BrowseElement; contents: PlaylistContentsItem[] }> {
	const browse = document.querySelector<BrowseElement>("ytd-browse[page-subtype='playlist']");
	if (!browse) return null;
	const data = browse.data as PlaylistPageDataContents | undefined;
	const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs;
	const section = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0];
	const videoList = section?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer;
	const contents = videoList?.contents;
	if (!contents || !Array.isArray(contents)) return null;
	return { browse, contents };
}

export async function poll<T>(fn: () => T, predicate: (result: T) => boolean, interval = 100, timeout = 3000): Promise<Nullable<T>> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const result = fn();
		if (predicate(result)) return result;
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
	return null;
}

export function reverseChildOrder(container: HTMLElement): void {
	const items = Array.from(container.children);
	items.reverse();
	for (const item of items) {
		container.appendChild(item);
	}
}

export const FEATURE_NAME = "playlistReverseButton";

export const PLAYLIST_PAGE_WAIT_SELECTOR = "ytd-playlist-video-list-renderer";

export function findVisibleActionRow(): Nullable<HTMLElement> {
	const header = findVisiblePlaylistPageHeader();
	if (!header) return null;
	const rows = header.querySelectorAll<HTMLElement>(".ytFlexibleActionsViewModelActionRow");
	for (const row of rows) {
		if ((row.clientWidth ?? 0) > 0) return row;
	}
	const actions = header.querySelectorAll<HTMLElement>("yt-flexible-actions-view-model");
	for (const el of actions) {
		if ((el.clientWidth ?? 0) > 0) return el;
	}
	return null;
}

export function findVisiblePlaylistPageHeader(): Nullable<HTMLElement> {
	return selectFirstWithWidth(...PLAYLIST_PAGE_HEADER_SELECTORS);
}

export function getPlaylistPageActionRow(timeout = 5000): Promise<Nullable<HTMLElement>> {
	return poll(findVisibleActionRow, (r) => r !== null, 100, timeout);
}

export function isCurrentlyReversed(): boolean {
	const result = getPlaylistData();
	if (result) return contentsAreReversed(result.playlist.contents);
	const playlistResult = getPlaylistPageData();
	if (playlistResult) return contentsAreReversed(playlistResult.contents);
	return false;
}

export function isPlaylistDataReady(): boolean {
	return getPlaylistData() !== null || getPlaylistPageData() !== null;
}

function contentsAreReversed(contents: PlaylistContentsItem[]): boolean {
	if (contents.length < 2) return false;
	const first = contents.at(0);
	const last = contents.at(-1);
	if (!first || !last) return false;
	const getIndex = (item: PlaylistContentsItem): number =>
		item.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.index ??
		item.playlistVideoRenderer?.navigationEndpoint?.watchEndpoint?.index ??
		0;
	return getIndex(first) > getIndex(last);
}
