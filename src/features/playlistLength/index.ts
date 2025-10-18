import type { Nullable } from "@/src/types";

import { YouTube_Enhancer_Public_Youtube_Data_API_V3_Key } from "@/src/utils/constants";
import eventManager from "@/src/utils/EventManager";
import { isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { getHeaderSelectors, initializePlaylistLength, playlistItemsSelector, type PlaylistLengthParameters } from "./utils";
let documentObserver: Nullable<MutationObserver> = null;
let resizeObserver: Nullable<ResizeObserver> = null;
export function disablePlaylistLength() {
	eventManager.removeEventListeners("playlistLength");
	documentObserver?.disconnect();
	documentObserver = null;
	resizeObserver?.disconnect();
	resizeObserver = null;
	document.querySelector("#yte-playlist-length-ui")?.remove();
}
export async function enablePlaylistLength() {
	const isWatchPageFlag = isWatchPage();
	const {
		data: {
			options: {
				enable_playlist_length,
				playlist_length_get_method: playlistLengthGetMethod,
				playlist_watch_time_get_method: playlistWatchTimeGetMethod
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_playlist_length) return;
	if (!document.querySelector(playlistItemsSelector())) return;
	const { playlist, watch } = getHeaderSelectors();
	await waitForAllElements([isWatchPageFlag ? watch : playlist, playlistItemsSelector()]);
	const pageType = isWatchPageFlag ? "watch" : "playlist";
	documentObserver = await initPlaylistLength({
		pageType,
		playlistLengthGetMethod,
		playlistWatchTimeGetMethod
	});
	resizeObserver?.disconnect();
	resizeObserver = new ResizeObserver(async () => {
		documentObserver = await initPlaylistLength({
			pageType,
			playlistLengthGetMethod,
			playlistWatchTimeGetMethod
		});
	});
	resizeObserver.observe(document.documentElement);
}
async function initPlaylistLength({
	pageType,
	playlistLengthGetMethod,
	playlistWatchTimeGetMethod
}: PlaylistLengthParameters): Promise<MutationObserver | null> {
	documentObserver?.disconnect();
	try {
		return await initializePlaylistLength({
			pageType,
			playlistLengthGetMethod,
			playlistWatchTimeGetMethod
		});
	} catch {
		return playlistLengthGetMethod === "html" ? null : (
				initPlaylistLength({
					pageType,
					playlistLengthGetMethod: "html",
					playlistWatchTimeGetMethod
				})
			);
	}
}
