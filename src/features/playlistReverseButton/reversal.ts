import type { Nullable } from "@/src/types";

import {
	type AutoplayData,
	type AutoplaySet,
	contentsAreReversed,
	currentSetupGeneration,
	getPlaylistData,
	getPlaylistItem,
	getPlaylistPageData,
	getReversalState,
	loadWholePlaylistPage,
	type ManagerElement,
	type NavigationEndpoint,
	type PanelElement,
	type PlaylistContentsItem,
	type PlaylistData,
	reverseChildOrder,
	type WatchFlexyElement,
	type YtdPlayerElement
} from "./utils";

type AutoplayEndpointKey = "autoplayVideo" | "nextButtonVideo" | "previousButtonVideo";

/** Reverses what the page holds, video entries only: a continuation entry stays last on the data side as in the DOM. */
function applyPlaylistPageReversal(): boolean {
	const result = getPlaylistPageData();
	if (!result) return false;

	const { contents } = result;
	reversePlaylistContents(contents);

	const listContainer = document.querySelector<HTMLElement>("ytd-playlist-video-list-renderer div#contents");
	if (listContainer) reverseChildOrder(listContainer);

	return true;
}

/**
 * Turns the watch page's playlist over, or back: the panel order, the position markers YouTube reads, and the
 * autoplay sets its playlist manager navigates with. Every consumer is handed the same objects, so the panel, the
 * manager, the player and the page data agree on the order afterwards.
 */
function applyReversal(): boolean {
	const result = getPlaylistData();
	if (!result) return false;
	const { autoplay, manager, panel, playlist, watchFlexy } = result;
	const reversing = contentsAreReversed(playlist.contents) !== true;

	// YouTube may load only a window of a long playlist and numbers the position as the window's offset plus the
	// position within it. Reversed, the position is the one within the window: that is what the playlist manager
	// compares with the window's size to tell whether there is a next video. Turned back, YouTube's numbering returns.
	const windowOffset = playlist.yteWindowOffset ?? Math.max(0, playlist.currentIndex - playlist.localCurrentIndex);
	playlist.yteWindowOffset = windowOffset;
	playlist.contents.reverse();
	playlist.localCurrentIndex = playlist.contents.length - 1 - playlist.localCurrentIndex;
	playlist.currentIndex = reversing ? playlist.localCurrentIndex : windowOffset + playlist.localCurrentIndex;
	rebuildAutoplaySets(autoplay, playlist, windowOffset === 0 && playlist.contents.length >= playlist.totalVideos);

	// The panel and the page only re-render from an object they have not seen, and the playlist read here is usually
	// the panel's own, so what is handed out is a copy; the copy is what the next read finds in the panel.
	const rendered: PlaylistData = { ...playlist, contents: [...playlist.contents] };
	syncWatchPageData(watchFlexy, rendered, autoplay);
	pushPlaylistData(manager, panel, rendered, autoplay);
	// The page re-renders from the data it was just handed; a second push afterwards makes sure that render did not
	// put YouTube's own copy back in front of the panel. Not after a cleanup or another setup in the meantime: the
	// panel element outlives an in-page navigation, and the push would hand it the previous page's playlist.
	const generation = currentSetupGeneration();
	setTimeout(() => {
		if (generation !== currentSetupGeneration()) return;
		pushPlaylistData(manager, panel, rendered, autoplay);
		const activeItem = document.querySelector<HTMLElement>("ytd-playlist-panel-video-renderer[selected], ytd-playlist-video-renderer[selected]");
		activeItem?.scrollIntoView({ block: "nearest" });
	}, 100);

	return true;
}

/**
 * Brings the watch page's playlist to the order the toggle asks for and reports whether anything had to change.
 * Reversing is a toggle, so outside a click this is the only way it is applied: the live order is read first and
 * left alone when it is already right, or when it cannot be told.
 */
function matchReversalToState(isReversed: boolean): boolean {
	const state = getReversalState();
	if (state === null || state === isReversed) return false;
	return applyReversal();
}

/** Hands the playlist to everything that plays from it: the panel, the playlist manager behind autoplay and the Next and Previous controls, and the player's own playlist. */
function pushPlaylistData(manager: Nullable<ManagerElement>, panel: Nullable<PanelElement>, playlist: PlaylistData, autoplay: AutoplayData): void {
	if (panel) {
		panel.data = playlist;
		panel.updateData?.(playlist);
	}
	if (manager) {
		manager.autoplayData = autoplay;
		manager.setPlaylistData?.(playlist);
	}
	const player = document.querySelector<YtdPlayerElement>("ytd-player");
	if (player?.updatePlayerComponents) player.updatePlayerComponents(playlist);
	else player?.updatePlayerPlaylist_?.(playlist);
}

/**
 * Derives the NORMAL and LOOP sets from the panel's neighbours, the way YouTube builds them itself when its panel
 * disagrees with the sets the server sent. Each entry is the neighbour's own navigation endpoint, which carries the
 * playlist id and position, so the traversal stays inside the playlist. Entries that would leave it, like the radio
 * YouTube suggests after the last video, are dropped rather than moved, and there is no autoplay past the last video
 * of the new order. The loop set wraps around only when the whole playlist is loaded: with a window of it, the ends
 * of the window are not the ends of the playlist. The shuffle sets are left alone: their order is YouTube's random one.
 */
function rebuildAutoplaySets(autoplay: AutoplayData, playlist: PlaylistData, wholePlaylistLoaded: boolean): void {
	const { contents, localCurrentIndex } = playlist;
	const { length: count } = contents;
	const endpointAt = (position: number): Nullable<NavigationEndpoint> => {
		const endpoint = getPlaylistItem(contents[position])?.navigationEndpoint;
		return endpoint?.watchEndpoint?.playlistId ? endpoint : null;
	};
	for (const set of autoplay.sets) {
		let next: Nullable<NavigationEndpoint>;
		let previous: Nullable<NavigationEndpoint>;
		if (set.mode === "LOOP" && wholePlaylistLoaded) {
			next = endpointAt((localCurrentIndex + 1) % count);
			previous = endpointAt((localCurrentIndex - 1 + count) % count);
		} else if (set.mode === "NORMAL" || set.mode === "LOOP") {
			next = endpointAt(localCurrentIndex + 1);
			previous = endpointAt(localCurrentIndex - 1);
		} else {
			continue;
		}
		setAutoplayEndpoint(set, "autoplayVideo", next);
		setAutoplayEndpoint(set, "nextButtonVideo", next);
		setAutoplayEndpoint(set, "previousButtonVideo", previous);
	}
}

function reversePlaylistContents(contents: PlaylistContentsItem[]): void {
	const isContinuation = (item: PlaylistContentsItem) => "continuationItemRenderer" in item;
	const videos = contents.filter((item) => !isContinuation(item)).reverse();
	const continuations = contents.filter(isContinuation);
	contents.splice(0, contents.length, ...videos, ...continuations);
}

/** The playlist page's reversal once every page of the playlist has been fetched, so the whole list turns over. */
async function reversePlaylistPage(): Promise<boolean> {
	await loadWholePlaylistPage();
	return applyPlaylistPageReversal();
}

function setAutoplayEndpoint(set: AutoplaySet, key: AutoplayEndpointKey, endpoint: Nullable<NavigationEndpoint>): void {
	if (endpoint) set[key] = endpoint;
	else delete set[key];
}

/**
 * Points the page's own data at the same playlist and autoplay objects and hands the page a fresh copy of it: the
 * page only re-renders from a new object, and the copy is what a later read of the page data sees.
 */
function syncWatchPageData(watchFlexy: WatchFlexyElement, playlist: PlaylistData, autoplay: AutoplayData): void {
	const results = watchFlexy.data?.contents?.twoColumnWatchNextResults;
	if (!results) return;
	if (results.playlist) results.playlist.playlist = playlist;
	if (results.autoplay) results.autoplay.autoplay = autoplay;
	watchFlexy.updatePageData_?.(JSON.parse(JSON.stringify(watchFlexy.data)));
}

/**
 * A click's toggle on the watch page: the live order is brought to the toggle's new state, and turned over as such
 * when the order cannot be told, so the click always does something visible.
 */
function toggleReversal(isReversed: boolean): boolean {
	return getReversalState() === null ? applyReversal() : matchReversalToState(isReversed);
}

export { applyPlaylistPageReversal, applyReversal, matchReversalToState, reversePlaylistPage, toggleReversal };
