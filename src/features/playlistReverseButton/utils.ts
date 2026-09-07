import type { Nullable } from "@/src/types";

import { createSVGElement } from "@/src/utils/dom/elements";
import { PLAYLIST_PAGE_HEADER_SELECTORS, selectFirstWithWidth } from "@/src/utils/dom/selectors";
import { isNewYouTubeVideoLayout, isPlaylistPage, isWatchPage } from "@/src/utils/url";

/**
 * Counts the feature's setups and cleanups. Work a setup leaves behind (the later push of a reversal, the checks that
 * follow a setup, the answer to a data hand-over) compares the generation it started in with the current one and
 * stands down when the feature has since been cleaned up or set up again.
 */
let setupGeneration = 0;

export interface AutoplayData {
	[key: string]: unknown;
	sets: AutoplaySet[];
}
/**
 * One of YouTube's autoplay sets, one per playback mode (NORMAL, LOOP, SHUFFLE, LOOP_SHUFFLE). The playlist manager
 * navigates with `autoplayVideo` when a video ends and with the two button entries for the player's Next and
 * Previous controls; an entry is absent when there is nowhere to go in that direction.
 */
export interface AutoplaySet {
	[key: string]: unknown;
	autoplayVideo?: NavigationEndpoint;
	mode?: string;
	nextButtonVideo?: NavigationEndpoint;
	previousButtonVideo?: NavigationEndpoint;
}
export interface BrowseElement extends HTMLElement {
	data?: Record<string, unknown>;
}
export interface ManagerElement extends HTMLElement {
	autoplayData?: AutoplayData;
	setPlaylistData?(data: PlaylistData): void;
}
export interface NavigationEndpoint {
	[key: string]: unknown;
	watchEndpoint?: { [key: string]: unknown; index?: number; playlistId?: string; videoId?: string };
}
export interface PanelElement extends HTMLElement {
	data?: PlaylistData;
	updateData?(data: PlaylistData): void;
}
export interface PlaylistContentsItem {
	[key: string]: unknown;
	playlistPanelVideoRenderer?: PlaylistItemRenderer;
	playlistPanelVideoWrapperRenderer?: { primaryRenderer?: { playlistPanelVideoRenderer?: PlaylistItemRenderer } };
	playlistVideoRenderer?: PlaylistItemRenderer;
}
export interface PlaylistData {
	[key: string]: unknown;
	contents: PlaylistContentsItem[];
	currentIndex: number;
	localCurrentIndex: number;
	playlistId?: string;
	totalVideos: number;
	/** The extension's own note of where the loaded window starts in the playlist; see applyReversal. */
	yteWindowOffset?: number;
}
export interface PlaylistItemRenderer {
	navigationEndpoint?: NavigationEndpoint;
	selected?: boolean;
	videoId?: string;
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
/** The playlist data a watch page plays from, and the elements it lives in. */
export interface WatchPlaylistData {
	autoplay: AutoplayData;
	manager: Nullable<ManagerElement>;
	panel: Nullable<PanelElement>;
	playlist: PlaylistData;
	watchFlexy: WatchFlexyElement;
}
export interface YtdPlayerElement extends HTMLElement {
	updatePlayerComponents?(playlist: PlaylistData): void;
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

/**
 * The playlist and autoplay data YouTube plays from on a watch page. The panel and the playlist manager are read
 * first: YouTube hands them its own copy of the playlist whenever it reloads it (its response to a navigation, the
 * rest of a long playlist, a queue or miniplayer change), and that copy never reaches the page's `data` again, so
 * the page data alone can be a stale picture of what is playing. Nothing is returned without a list in the address,
 * or for a panel left behind by another playlist.
 */
export function getPlaylistData(): Nullable<WatchPlaylistData> {
	if (!isWatchPage()) return null;
	const playlistId = new URLSearchParams(window.location.search).get("list");
	if (!playlistId) return null;
	const watchFlexy = document.querySelector<WatchFlexyElement>("ytd-watch-flexy, ytd-watch-grid");
	if (!watchFlexy) return null;
	const results = watchFlexy.data?.contents?.twoColumnWatchNextResults;
	const panel = getPlaylistPanel(watchFlexy);
	const manager = document.querySelector<ManagerElement>("yt-playlist-manager");
	const panelPlaylist = panel?.data;
	const playlist =
		panelPlaylist && Array.isArray(panelPlaylist.contents) && panelPlaylist.contents.length > 0 ? panelPlaylist : results?.playlist?.playlist;
	const managerAutoplay = manager?.autoplayData;
	const autoplay = managerAutoplay && Array.isArray(managerAutoplay.sets) ? managerAutoplay : results?.autoplay?.autoplay;
	if (!playlist?.contents || !autoplay?.sets) return null;
	if (playlist.playlistId && playlist.playlistId !== playlistId) return null;
	return { autoplay, manager, panel, playlist, watchFlexy };
}

/** The video renderer behind a playlist entry, whichever wrapper YouTube put it in; null for a continuation entry. */
export function getPlaylistItem(item: Nullable<PlaylistContentsItem> | undefined): Nullable<PlaylistItemRenderer> {
	if (!item) return null;
	return (
		item.playlistPanelVideoRenderer ??
		item.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer ??
		item.playlistVideoRenderer ??
		null
	);
}

export function getPlaylistPageData(): Nullable<{ browse: BrowseElement; contents: PlaylistContentsItem[] }> {
	if (!isPlaylistPage()) return null;
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

/** The watch page's playlist panel: the one inside the page, not one the miniplayer or another layout keeps around. */
export function getPlaylistPanel(watchFlexy: Nullable<HTMLElement> = null): Nullable<PanelElement> {
	const root = watchFlexy ?? document.querySelector<HTMLElement>("ytd-watch-flexy, ytd-watch-grid");
	return (
		root?.querySelector<PanelElement>("ytd-playlist-panel-renderer#playlist") ?? document.querySelector<PanelElement>("ytd-playlist-panel-renderer")
	);
}

/**
 * Whether the loaded playlist runs backwards, judged by the playlist positions of its first and last video. Null when
 * that cannot be told, for fewer than two videos or positions YouTube did not send: reversing is a toggle, so on a
 * guess the list would be flipped the wrong way each time it is checked.
 */
export function getReversalState(): Nullable<boolean> {
	const result = getPlaylistData();
	if (result) return contentsAreReversed(result.playlist.contents);
	const playlistResult = getPlaylistPageData();
	if (playlistResult) return contentsAreReversed(playlistResult.contents);
	return null;
}

export function isCurrentlyReversed(): boolean {
	return getReversalState() === true;
}

/**
 * Whether the watch page's playlist data belongs to the video in the address bar. After an in-page navigation the
 * previous video's data stays in place until YouTube's response for the new one arrives, and reversing that would
 * turn the wrong list over.
 */
export function isPlaylistDataCurrent(): boolean {
	const videoId = new URLSearchParams(window.location.search).get("v");
	if (!videoId) return true;
	const result = getPlaylistData();
	if (!result) return false;
	const {
		playlist: { contents, localCurrentIndex }
	} = result;
	const current = contents.map(getPlaylistItem).find((item) => item?.selected) ?? getPlaylistItem(contents[localCurrentIndex]);
	return current?.videoId === videoId;
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
	// The continuation item stays last: reversed to the top it would sit in view and fetch the next page at once.
	const children = Array.from(container.children);
	const rows = children.filter((child) => !isContinuationElement(child)).reverse();
	const continuations = children.filter(isContinuationElement);
	for (const item of [...rows, ...continuations]) {
		container.appendChild(item);
	}
}

const PLAYLIST_PAGE_CONTINUATION_SELECTOR = "ytd-playlist-video-list-renderer div#contents > ytd-continuation-item-renderer";
const PLAYLIST_PAGE_ROW_SELECTOR = "ytd-playlist-video-list-renderer ytd-playlist-video-renderer";

/**
 * Fetches every page of the playlist. YouTube renders a hundred rows and fetches the next hundred once its
 * continuation item scrolls into view, so reversing what is loaded would leave the rest to arrive below in
 * forward order. The continuation item is scrolled into view until none is left, the scroll position is given
 * back afterwards, and the rounds are capped so a playlist of thousands does not hold the page for long.
 */
export async function loadWholePlaylistPage(maxPages = 50): Promise<void> {
	const { scrollX, scrollY } = window;
	try {
		for (let pages = 0; pages < maxPages; pages++) {
			const continuation = document.querySelector<HTMLElement>(PLAYLIST_PAGE_CONTINUATION_SELECTOR);
			if (!continuation) return;
			const { length: rowsBefore } = document.querySelectorAll(PLAYLIST_PAGE_ROW_SELECTOR);
			continuation.scrollIntoView({ block: "center" });
			const loaded = await poll(
				() =>
					document.querySelectorAll(PLAYLIST_PAGE_ROW_SELECTOR).length > rowsBefore ||
					document.querySelector(PLAYLIST_PAGE_CONTINUATION_SELECTOR) === null,
				Boolean,
				100,
				10000
			);
			if (!loaded) return;
		}
	} finally {
		window.scrollTo(scrollX, scrollY);
	}
}

function isContinuationElement(element: Element): boolean {
	return element.tagName === "YTD-CONTINUATION-ITEM-RENDERER";
}

export const FEATURE_NAME = "playlistReverseButton";

export const PLAYLIST_PAGE_WAIT_SELECTOR = "ytd-playlist-video-list-renderer";

/**
 * Whether these playlist entries run backwards, by the playlist positions of the first and last video; null when
 * that cannot be told, for fewer than two videos or positions YouTube did not send.
 */
export function contentsAreReversed(contents: PlaylistContentsItem[]): Nullable<boolean> {
	const positions = contents
		.map((item) => getPlaylistItem(item)?.navigationEndpoint?.watchEndpoint?.index)
		.filter((position): position is number => typeof position === "number");
	if (positions.length < 2) return null;
	const [first] = positions;
	const last = positions.at(-1);
	if (last === undefined || first === last) return null;
	return first > last;
}

export function currentSetupGeneration(): number {
	return setupGeneration;
}

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

export function isPlaylistDataReady(): boolean {
	return getPlaylistData() !== null || getPlaylistPageData() !== null;
}

/** Marks a setup or a cleanup; see setupGeneration. */
export function nextSetupGeneration(): number {
	setupGeneration += 1;
	return setupGeneration;
}
