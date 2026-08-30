import React from "react";
import { FaTrashAlt, FaUndoAlt } from "react-icons/fa";

import type { configuration, Nullable, YtActionEvent } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { createActionButton } from "@/src/features/playlistManagementButtons/button";
import { removeFromHistory, removeFromPlaylist } from "@/src/features/playlistManagementButtons/utils";
import { IsDarkMode } from "@/src/utils/dom/state";
import { waitForElement } from "@/src/utils/dom/wait";
import { getThumbnailOverlay, getWatchedPercentage } from "@/src/utils/video";

import { getPlaylistId } from "../playlistLength/utils";
import "./index.css";
import { metadata } from "./index.metadata";

interface YTDPlaylistVideoRenderer extends HTMLElement {
	data: {
		setVideoId: string;
	};
	playlistVideoId: string;
}
const PLAYLIST_ITEM_SELECTOR = "ytd-playlist-video-list-renderer ytd-playlist-video-renderer";
const CHIP_BAR_VIEW_MODEL_HEADER_SELECTOR = "chip-bar-view-model";

let playlistObserver: Nullable<MutationObserver> = null;
let preparePageDisposeListener: Nullable<(event: Event) => void> = null;
let removeAllButton: Nullable<HTMLButtonElement> = null;

const cleanupPlaylistManagementButtons = () => {
	if (playlistObserver) {
		playlistObserver.disconnect();
		playlistObserver = null;
	}
	if (preparePageDisposeListener) {
		document.removeEventListener("yt-action", preparePageDisposeListener);
		preparePageDisposeListener = null;
	}
	if (removeAllButton) {
		removeAllButton.remove();
		removeAllButton = null;
	}
	const playlistItems = document.querySelectorAll(PLAYLIST_ITEM_SELECTOR);
	playlistItems.forEach((item) => {
		item.querySelectorAll(".yte-remove-button, .yte-reset-button").forEach((btn) => btn.remove());
	});
};

function setupPlaylistManagementButtons(config: configuration["playlistManagementButtons"]) {
	preparePageDisposeListener = (event) => {
		if ((event as YtActionEvent).detail.actionName !== "yt-prepare-page-dispose") {
			return;
		}

		void registry.updateFeatureEnabledState("playlistManagementButtons", false, config);
	};
	document.addEventListener("yt-action", preparePageDisposeListener);
	void (async () => {
		if (!(await waitForElement("ytd-playlist-video-list-renderer #sort-filter-menu:not(:empty)", 2500, "optional"))) {
			return;
		}

		async function addButtonToPlaylistItems() {
			const playlistItems = document.querySelectorAll(`${PLAYLIST_ITEM_SELECTOR}:has(ytd-thumbnail-overlay-time-status-renderer)`);
			for (const item of playlistItems) {
				const menu = item.querySelector("#menu");
				if (!menu) {
					continue;
				}

				const removeButton = item.querySelector(".yte-remove-button");
				const resetButton = item.querySelector(".yte-reset-button");
				const hasWatchProgress = getWatchedPercentage(item) > 0;

				if (enable_playlist_remove_button && !removeButton) {
					const removeButton = await createActionButton({
						className: "yte-remove-button yte-action-button-large",
						featureName: "playlistManagementButtons",
						icon: FaTrashAlt,
						iconColor: IsDarkMode() ? "white" : "black",
						onClick: async () => {
							const playlistId = getPlaylistId()!;
							const {
								data: { setVideoId }
							} = item as YTDPlaylistVideoRenderer;
							await removeFromPlaylist(playlistId, setVideoId);
							await addRemoveAllButton();
						},
						translationError: (translations) => translations.pages.content.features.playlistManagementButtons.extras.failedToRemoveVideo,
						translationHover: (translations) => translations.pages.content.features.playlistManagementButtons.extras.removeVideo,
						translationProcessing: (translations) => translations.pages.content.features.playlistManagementButtons.extras.removingVideo
					});
					if (item.querySelector(".yte-remove-button")) continue;
					removeButton.style.verticalAlign = "top";
					menu.prepend(removeButton);
				}

				if (enable_playlist_reset_button && !resetButton && hasWatchProgress) {
					const resetButton = await createActionButton({
						className: "yte-reset-button yte-action-button-large",
						featureName: "playlistManagementButtons",
						icon: FaUndoAlt,
						iconColor: IsDarkMode() ? "white" : "black",
						onClick: async () => {
							const { playlistVideoId: videoId } = item as YTDPlaylistVideoRenderer;
							await removeFromHistory(videoId);
							getThumbnailOverlay(item)?.remove();
							resetButton.remove();
							await addRemoveAllButton();
						},
						translationError: (translations) => translations.pages.content.features.playlistManagementButtons.extras.failedToMarkAsUnwatched,
						translationHover: (translations) => translations.pages.content.features.playlistManagementButtons.extras.markAsUnwatched,
						translationProcessing: (translations) => translations.pages.content.features.playlistManagementButtons.extras.markingAsUnwatched
					});
					if (item.querySelector(".yte-reset-button")) continue;
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
			}
		}

		async function addRemoveAllButton() {
			if (!enable_remove_all_watched_button) return;

			const header = document.querySelector<HTMLElement>(CHIP_BAR_VIEW_MODEL_HEADER_SELECTOR);
			if (!header) return;

			const playlistItems = document.querySelectorAll(PLAYLIST_ITEM_SELECTOR);
			let watchedCount = 0;
			playlistItems.forEach((item) => {
				const timeStatus = item.querySelector("ytd-thumbnail-overlay-time-status-renderer");
				if (!timeStatus) return;

				const progressWidth = getWatchedPercentage(item);
				if (progressWidth === 100) {
					watchedCount++;
				}
			});

			if (watchedCount === 0) {
				removeAllButton?.remove();
				return;
			}

			const text = window.i18nextInstance.t(
				(translations) =>
					translations.pages.content.features.playlistManagementButtons.extras[
						watchedCount === 1 ? "removeAllWatchedVideo" : "removeAllWatchedVideos"
					],
				{ count: watchedCount }
			);
			const { renderToString } = await import("react-dom/server");
			const trashIcon = renderToString(React.createElement(FaTrashAlt, { size: 12, style: { marginRight: "12px", verticalAlign: "middle" } }));
			const existingButton = document.getElementById("yte-remove-all-watched-button");
			if (existingButton) {
				existingButton.innerHTML = trashIcon + text;
				return;
			}

			const button = document.createElement("button");
			button.id = "yte-remove-all-watched-button";
			button.className = "yte-remove-all-watched-button";
			button.innerHTML = trashIcon + text;
			removeAllButton = button;

			removeAllButton.onclick = async () => {
				if (!removeAllButton) return;

				const { innerHTML: originalHTML, title: originalTitle } = removeAllButton;
				removeAllButton.disabled = true;
				removeAllButton.textContent = window.i18nextInstance.t(
					(translations) => translations.pages.content.features.playlistManagementButtons.extras.removingWatchedVideos
				);
				playlistObserver?.disconnect();

				try {
					const playlistId = getPlaylistId()!;
					const playlistItems = document.querySelectorAll(PLAYLIST_ITEM_SELECTOR);

					const videoIdsToRemove: string[] = [];
					playlistItems.forEach((item) => {
						const progressWidth = getWatchedPercentage(item);
						if (progressWidth === 100) {
							videoIdsToRemove.push((item as YTDPlaylistVideoRenderer).data.setVideoId);
						}
					});

					for (const setVideoId of videoIdsToRemove) {
						await removeFromPlaylist(playlistId, setVideoId);
					}
				} catch (error) {
					console.error("Failed to remove watched videos:", error);
				} finally {
					const container = document.querySelector("ytd-playlist-video-list-renderer");
					if (container && playlistObserver) {
						playlistObserver.observe(container, { childList: true, subtree: true });
					}
					removeAllButton.disabled = false;
					removeAllButton.innerHTML = originalHTML;
					removeAllButton.title = originalTitle;
					await addRemoveAllButton();
				}
			};

			header.appendChild(removeAllButton);
		}

		async function observePlaylist() {
			if (playlistObserver) {
				return;
			}

			await addButtonToPlaylistItems();
			await addRemoveAllButton();
			const container = document.querySelector("ytd-playlist-video-list-renderer");
			if (container) {
				playlistObserver = new MutationObserver(() => {
					void addButtonToPlaylistItems();
					void addRemoveAllButton();
				});
				playlistObserver.observe(container, { childList: true, subtree: true });
			}
		}

		const {
			removeAllButton: { enabled: enable_remove_all_watched_button },
			removeButton: { enabled: enable_playlist_remove_button },
			resetButton: { enabled: enable_playlist_reset_button }
		} = config;

		await observePlaylist();
	})();
}

export default createFeature({
	...metadata,
	onConfigChange: (config) => {
		cleanupPlaylistManagementButtons();
		setupPlaylistManagementButtons(config);
	},
	onDisable: cleanupPlaylistManagementButtons,
	onEnable: setupPlaylistManagementButtons,
	onNavigate: () => {
		cleanupPlaylistManagementButtons();
		setupPlaylistManagementButtons(registry.configManager.getLast("playlistManagementButtons"));
	}
});
