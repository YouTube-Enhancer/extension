import type { Nullable } from "@/src/types";

import { YouTube_Enhancer_Public_Youtube_Data_API_V3_Key } from "@/src/utils/constants";
import eventManager from "@/src/utils/EventManager";
import { isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { getHeaderSelectors, initializePlaylistLength, playlistItemsSelector } from "./utils";
let documentObserver: Nullable<MutationObserver> = null;
export function disablePlaylistLength() {
	eventManager.removeEventListeners("playlistLength");
	if (documentObserver) documentObserver.disconnect();
	document.querySelector("#yte-playlist-length-ui")?.remove();
}
export async function enablePlaylistLength() {
	const IsWatchPage = isWatchPage();
	const {
		data: {
			options: {
				enable_playlist_length,
				playlist_length_get_method: playlistLengthGetMethod,
				playlist_watch_time_get_method: playlistWatchTimeGetMethod,
				youtube_data_api_v3_key
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_playlist_length) return;
	const urlContainsListParameter = window.location.href.includes("list=");
	if (!urlContainsListParameter) return;
	const { playlist, watch } = getHeaderSelectors();
	await waitForAllElements([isWatchPage() ? watch : playlist(), playlistItemsSelector()]);
	const apiKey = youtube_data_api_v3_key === "" ? YouTube_Enhancer_Public_Youtube_Data_API_V3_Key : youtube_data_api_v3_key;
	const pageType = IsWatchPage ? "watch" : "playlist";
	try {
		documentObserver = await initializePlaylistLength({
			apiKey,
			pageType,
			playlistLengthGetMethod,
			playlistWatchTimeGetMethod
		});
	} catch (_error) {
		documentObserver?.disconnect();
		documentObserver = null;
		documentObserver = await initializePlaylistLength({
			apiKey,
			pageType,
			playlistLengthGetMethod: "html",
			playlistWatchTimeGetMethod
		});
	}
	window.addEventListener("resize", async () => {
		try {
			documentObserver = await initializePlaylistLength({
				apiKey,
				pageType,
				playlistLengthGetMethod,
				playlistWatchTimeGetMethod
			});
		} catch (_error) {
			documentObserver?.disconnect();
			documentObserver = null;
			documentObserver = await initializePlaylistLength({
				apiKey,
				pageType,
				playlistLengthGetMethod: "html",
				playlistWatchTimeGetMethod
			});
		}
	});
}
