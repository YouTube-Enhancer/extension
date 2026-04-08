import { FaTrashAlt, FaUndoAlt } from "react-icons/fa";
import { Innertube } from "youtubei.js/web";

import { createActionButton } from "@/src/features/playlistManagementButtons/ActionButton";
import { IsDarkMode, waitForSpecificMessage } from "@/src/utils/utilities";

import { getPlaylistId } from "../playlistLength/utils";

interface YTDPlaylistVideoRenderer extends HTMLElement {
	data: {
		setVideoId: string;
	};
	playlistVideoId: string;
}

if (window.trustedTypes && !window.trustedTypes.defaultPolicy) {
	window.trustedTypes.createPolicy("default", {
		createHTML: (input: string) => input
	});
}

const PLAYLIST_ITEM_SELECTOR = "ytd-playlist-video-list-renderer ytd-playlist-video-renderer";
const THUMBAIL_OVERLAY_SELECTOR = "#overlays ytd-thumbnail-overlay-resume-playback-renderer";
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
			options: { enable_playlist_remove_button, enable_playlist_reset_button }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");

	if (
		(!enable_playlist_remove_button && !enable_playlist_reset_button) ||
		!document.querySelector("ytd-playlist-video-list-renderer #sort-filter-menu:not(:empty)")
	) {
		return;
	}

	document.addEventListener("yt-action", async (event) => {
		if ((event as CustomEvent).detail.actionName === "yt-prepare-page-dispose") {
			await disablePlaylistManagementButtons();
		}
	});

	const youtube = await Innertube.create({
		cookie: document.cookie,
		fetch: (...args) => fetch(...args)
	});

	function addButtonToPlaylistItems() {
		const playlistItems = document.querySelectorAll(`${PLAYLIST_ITEM_SELECTOR}:has(ytd-thumbnail-overlay-time-status-renderer)`);
		playlistItems.forEach((item) => {
			const menu = item.querySelector("#menu");
			if (!menu) {
				return;
			}

			const removeButton = item.querySelector(".yte-remove-button");
			const resetButton = item.querySelector(".yte-reset-button");
			const resumeOverlay = item.querySelector(THUMBAIL_OVERLAY_SELECTOR);

			if (enable_playlist_remove_button && !removeButton) {
				const removeButton = createActionButton({
					className: "yte-remove-button yte-action-button-large",
					featureName: "playlistManagementButtons",
					icon: FaTrashAlt,
					iconColor: IsDarkMode() ? "white" : "black",
					onClick: async () => {
						const playlistId = getPlaylistId()!;
						const {
							data: { setVideoId }
						} = item as YTDPlaylistVideoRenderer;
						await removeFromPlaylist(youtube, playlistId, setVideoId);
					},
					translationError: `${TRANSLATION_KEY_PREFIX}.failedToRemoveVideo`,
					translationHover: `${TRANSLATION_KEY_PREFIX}.removeVideo`,
					translationProcessing: `${TRANSLATION_KEY_PREFIX}.removingVideo`
				});
				removeButton.style.verticalAlign = "top";
				menu.prepend(removeButton);
			}

			if (enable_playlist_reset_button && !resetButton && resumeOverlay) {
				const resetButton = createActionButton({
					className: "yte-reset-button yte-action-button-large",
					featureName: "playlistManagementButtons",
					icon: FaUndoAlt,
					iconColor: IsDarkMode() ? "white" : "black",
					onClick: async () => {
						const { playlistVideoId: videoId } = item as YTDPlaylistVideoRenderer;
						const history = await youtube.getHistory();
						await history.removeVideo(videoId, 5);
						item.querySelector(THUMBAIL_OVERLAY_SELECTOR)?.remove();
						resetButton.remove();
					},
					translationError: `${TRANSLATION_KEY_PREFIX}.failedToMarkAsUnwatched`,
					translationHover: `${TRANSLATION_KEY_PREFIX}.markAsUnwatched`,
					translationProcessing: `${TRANSLATION_KEY_PREFIX}.markingAsUnwatched`
				});
				resetButton.style.verticalAlign = "top";
				if (enable_playlist_remove_button && removeButton) {
					removeButton.prepend(resetButton);
				} else {
					menu.prepend(resetButton);
				}
			}

			Array.from(menu.children).forEach((child) => {
				(child as HTMLElement).style.display = "inline-flex";
			});
		});
	}

	function observePlaylist() {
		if (playlistObserver) {
			return;
		}

		addButtonToPlaylistItems();
		const container = document.querySelector("ytd-playlist-video-list-renderer");
		if (container) {
			playlistObserver = new MutationObserver(addButtonToPlaylistItems);
			playlistObserver.observe(container, { childList: true, subtree: true });
		}
	}

	observePlaylist();
}

async function removeFromPlaylist(youtube: Innertube, playlistId: string, setVideoId: string) {
	const response = await youtube.actions.execute("/browse/edit_playlist", {
		actions: [
			{
				action: "ACTION_REMOVE_VIDEO",
				setVideoId
			}
		],
		params: "CAFAAQ%3D%3D",
		playlistId
	});

	document.querySelector("ytd-app")?.dispatchEvent(
		new CustomEvent("yt-action", {
			detail: {
				actionName: "yt-playlist-remove-videos-action",
				args: [{ playlistRemoveVideosAction: { setVideoIds: [setVideoId] } }],
				returnValue: []
			}
		})
	);

	// triggers a sidebar update for regular playlists
	if (response?.data?.frameworkUpdates?.entityBatchUpdate) {
		document.querySelector("ytd-app")?.dispatchEvent(
			new CustomEvent("yt-action", {
				detail: {
					actionName: "yt-entity-update-command",
					args: [{ entityUpdateCommand: { entityBatchUpdate: response.data.frameworkUpdates.entityBatchUpdate } }],
					returnValue: []
				}
			})
		);
	}

	// triggers a sidebar update for the WL playlist
	if (response?.data?.newHeader?.playlistHeaderRenderer) {
		document.querySelector("ytd-playlist-header-renderer")?.dispatchEvent(
			new CustomEvent("yt-new-playlist-header", {
				detail: response.data.newHeader.playlistHeaderRenderer
			})
		);
	}
}
