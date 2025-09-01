import React from "react";
import { renderToString } from "react-dom/server";
import { FaUndoAlt } from "react-icons/fa";
import { FaTrash } from "react-icons/fa6";
import { Innertube } from "youtubei.js/web";

import "./index.css";
import { isPlaylistPage, waitForSpecificMessage } from "@/src/utils/utilities";

interface YTDPlaylistVideoRenderer extends HTMLElement {
	playlistVideoId: string;
}

let playlistObserver: MutationObserver | null = null;

export async function disablePlaylistManagementButtons() {
	if (playlistObserver) {
		playlistObserver.disconnect();
		playlistObserver = null;
	}

	const playlistItems = document.querySelectorAll("ytd-playlist-panel-video-renderer, ytd-playlist-video-renderer");
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

	if (!enable_playlist_management_buttons || !isPlaylistPage()) {
		return;
	}

	const youtube = await Innertube.create({
		cookie: document.cookie,
		fetch: (...args) => fetch(...args)
	});

	function addButtonToPlaylistItems() {
		const playlistItems = document.querySelectorAll("ytd-playlist-panel-video-renderer, ytd-playlist-video-renderer");
		playlistItems.forEach((item) => {
			if (item.querySelector(".yte-remove-button") || item.querySelector(".yte-reset-button")) {
				return;
			}

			const { playlistVideoId: setVideoId } = item as YTDPlaylistVideoRenderer;
			if (!setVideoId) {
				return;
			}

			const removeButton = document.createElement("button");
			removeButton.insertAdjacentHTML("afterbegin", renderToString(React.createElement(FaTrash, { color: "red", size: 18 })));
			removeButton.className = "yte-remove-button";
			removeButton.title = "Remove video";
			removeButton.onclick = async () => {
				try {
					const playlistId = new URLSearchParams(window.location.search).get("list") as string;
					await youtube.playlist.removeVideos(playlistId, [setVideoId]);
					item.remove();
				} catch (err) {
					console.error("Failed to remove video:", err);
				}
			};

			const resetButton = document.createElement("button");
			resetButton.insertAdjacentHTML("afterbegin", renderToString(React.createElement(FaUndoAlt, { color: "red", size: 18 })));
			resetButton.className = "yte-reset-button";
			resetButton.title = "Mark as unwatched";
			resetButton.onclick = async () => {
				try {
					const history = await youtube.getHistory();
					await history.removeVideo(setVideoId);
					item.querySelector("#overlays ytd-thumbnail-overlay-resume-playback-renderer")?.remove();
				} catch (err) {
					console.error("Failed to reset video:", err);
				}
			};

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
		playlistObserver = new MutationObserver(addButtonToPlaylistItems);
		playlistObserver.observe(document.body, { childList: true, subtree: true });
	}

	window.addEventListener("DOMContentLoaded", observePlaylist);
	if (document.readyState === "complete" || document.readyState === "interactive") {
		observePlaylist();
	}
}
