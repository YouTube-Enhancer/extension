import { FaUndoAlt } from "react-icons/fa";
import { FaTrash } from "react-icons/fa6";
import { Innertube } from "youtubei.js/web";

import { createActionButton } from "@/src/features/playlistManagementButtons/ActionButton";
import { isPlaylistPage, waitForSpecificMessage } from "@/src/utils/utilities";

import { getPlaylistId } from "../playlistLength/utils";

interface YTDPlaylistVideoRenderer extends HTMLElement {
	playlistVideoId: string;
}

if (window.trustedTypes && !window.trustedTypes.defaultPolicy) {
	window.trustedTypes.createPolicy("default", {
		createHTML: (input: string) => input
	});
}

const PLAYLIST_ITEM_SELECTOR =
	"ytd-playlist-video-list-renderer ytd-playlist-panel-video-renderer, ytd-playlist-video-list-renderer ytd-playlist-video-renderer";
const TRANSLATION_KEY_PREFIX = "settings.sections.playlistManagementButtons";

let playlistObserver: MutationObserver | null = null;

export async function disablePlaylistManagementButtons() {
	if (playlistObserver) {
		playlistObserver.disconnect();
		playlistObserver = null;
	}

	const playlistItems = document.querySelectorAll(PLAYLIST_ITEM_SELECTOR);
	playlistItems.forEach((item) => {
		item.querySelectorAll(".yte-remove-button, .yte-reset-button").forEach((btn) => btn.remove());
	});
}

export async function enablePlaylistManagementButtons() {
	const {
		data: {
			options: { enable_playlist_management_buttons }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");

	if (!enable_playlist_management_buttons || !isPlaylistPage() || getPlaylistId() === "LL") {
		return;
	}

	const youtube = await Innertube.create({
		cookie: document.cookie,
		fetch: (...args) => fetch(...args)
	});

	function addButtonToPlaylistItems() {
		const playlistItems = document.querySelectorAll(`${PLAYLIST_ITEM_SELECTOR}:has(ytd-thumbnail-overlay-time-status-renderer)`);
		playlistItems.forEach((item) => {
			if (item.querySelector(".yte-remove-button") || item.querySelector(".yte-reset-button")) {
				return;
			}

			const { playlistVideoId: setVideoId } = item as YTDPlaylistVideoRenderer;
			if (!setVideoId) {
				return;
			}

			const removeButton = createActionButton({
				className: "yte-remove-button yte-action-button-large",
				featureName: "playlistManagementButtons",
				icon: FaTrash,
				iconColor: "red",
				onClick: async () => {
					const playlistId = getPlaylistId()!;
					await youtube.playlist.removeVideos(playlistId, [setVideoId]);
					item.remove();
				},
				translationError: `${TRANSLATION_KEY_PREFIX}.failedToRemoveVideo`,
				translationHover: `${TRANSLATION_KEY_PREFIX}.removeVideo`,
				translationProcessing: `${TRANSLATION_KEY_PREFIX}.removingVideo`
			});
			removeButton.style.verticalAlign = "top";

			const resetButton = createActionButton({
				className: "yte-reset-button yte-action-button-large",
				featureName: "playlistManagementButtons",
				icon: FaUndoAlt,
				iconColor: "gray",
				onClick: async () => {
					const history = await youtube.getHistory();
					await history.removeVideo(setVideoId, 5);
					item.querySelector("#overlays ytd-thumbnail-overlay-resume-playback-renderer")?.remove();
					resetButton.remove();
				},
				translationError: `${TRANSLATION_KEY_PREFIX}.failedToMarkAsUnwatched`,
				translationHover: `${TRANSLATION_KEY_PREFIX}.markAsUnwatched`,
				translationProcessing: `${TRANSLATION_KEY_PREFIX}.markingAsUnwatched`
			});
			resetButton.style.verticalAlign = "top";

			const menu = item.querySelector("#menu");
			if (menu) {
				menu.prepend(removeButton);
				menu.prepend(resetButton);
				Array.from(menu.children).forEach((child) => {
					(child as HTMLElement).style.display = "inline-flex";
				});
			}
		});
	}

	function observePlaylist() {
		addButtonToPlaylistItems();
		const container = document.querySelector("ytd-playlist-video-list-renderer");
		if (container) {
			playlistObserver = new MutationObserver(addButtonToPlaylistItems);
			playlistObserver.observe(container, { childList: true, subtree: true });
		}
	}

	window.addEventListener("DOMContentLoaded", observePlaylist);
	if (document.readyState === "complete" || document.readyState === "interactive") {
		observePlaylist();
	}
}
