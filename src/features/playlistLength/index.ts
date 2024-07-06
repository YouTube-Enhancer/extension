import type { Nullable } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { YouTube_Enhancer_Public_Youtube_Data_API_V3_Key } from "@/src/utils/constants";
import { isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { headerSelector, initializePlaylistLength, playlistItemsSelector } from "./utils";
let documentObserver: Nullable<MutationObserver> = null;
export async function enablePlaylistLength() {
	const IsWatchPage = isWatchPage();
	const {
		data: {
			options: { enable_playlist_length, playlist_length_get_method: playlistLengthGetMethod, youtube_data_api_v3_key }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_playlist_length) return;
	const urlContainsListParameter = window.location.href.includes("list=");
	if (!urlContainsListParameter) return;
	await waitForAllElements([headerSelector(), playlistItemsSelector()]);
	const apiKey = youtube_data_api_v3_key === "" ? YouTube_Enhancer_Public_Youtube_Data_API_V3_Key : youtube_data_api_v3_key;
	const pageType = IsWatchPage ? "watch" : "playlist";
	try {
		documentObserver = await initializePlaylistLength({
			apiKey,
			pageType,
			playlistLengthGetMethod
		});
	} catch (error) {
		documentObserver?.disconnect();
		documentObserver = null;
		documentObserver = await initializePlaylistLength({
			apiKey,
			pageType,
			playlistLengthGetMethod: "html"
		});
	}
}
// FIXME: mix playlist type not falling back to get mode html when get mode is api
export function disablePlaylistLength() {
	eventManager.removeEventListeners("playlistLength");
	if (documentObserver) documentObserver.disconnect();
	document.querySelector("#yte-playlist-length-ui")?.remove();
}
