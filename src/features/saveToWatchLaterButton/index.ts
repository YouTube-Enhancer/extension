import type { Nullable, YtActionEvent } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { createActionButton } from "@/src/features/playlistManagementButtons/ActionButton";
import { getYouTubeIcon } from "@/src/utils/dom/nativeIcons";
import { getCurrentPageType } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import "./index.css";

interface YTLockupViewModel extends HTMLElement {
	rawProps: {
		data: () => {
			contentId: string;
		};
	};
}

let videosObserver: Nullable<MutationObserver> = null;
let pageDisposeListener: Nullable<(event: Event) => void> = null;

async function setupSaveToWatchLaterButtons() {
	// Register the listener one time. Each setup run must not add one more copy.
	if (!pageDisposeListener) {
		pageDisposeListener = (event) => {
			if ((event as YtActionEvent).detail.actionName === "yt-prepare-page-dispose") {
				void (async () => {
					await registry.updateFeatureEnabledState("saveToWatchLaterButton", false, registry.configManager.getLast("saveToWatchLaterButton"));
				})();
			}
		};
		document.addEventListener("yt-action", pageDisposeListener);
	}

	const { Innertube } = await import("youtubei.js/web");
	const youtube = await Innertube.create({
		cookie: document.cookie,
		fetch: (...args) => fetch(...args)
	});

	const containerSelector = `ytd-two-column-browse-results-renderer[page-subtype='${await getCurrentPageType()}']`;
	const icon = await getYouTubeIcon("watchLater");

	async function addButtonToVideoItems() {
		const videos = document.querySelectorAll(`${containerSelector} yt-lockup-view-model:not(:has(.yte-save-to-watch-later-button))`);
		for (const video of videos) {
			const ytLockupViewModel = video as YTLockupViewModel;
			if (
				!ytLockupViewModel.rawProps ||
				(ytLockupViewModel.rawProps && !ytLockupViewModel.rawProps.data) ||
				(ytLockupViewModel.rawProps && ytLockupViewModel.rawProps.data && typeof ytLockupViewModel.rawProps.data !== "function")
			)
				continue;
			const { contentId: videoId } = ytLockupViewModel.rawProps.data();

			const saveButton = await createActionButton({
				className: "yte-save-to-watch-later-button yte-action-button-large",
				featureName: "saveToWatchLaterButton",
				icon,
				iconColor: "currentColor",
				onClick: async () => {
					await youtube.playlist.addVideos("WL", [videoId]);
					saveButton.closest("yt-lockup-view-model")!.querySelector("h3")!.style.paddingRight = "0";
					saveButton.style.display = "none";
				},
				translationError: (translations) => translations.pages.content.features.saveToWatchLaterButton.extras.failedToSaveVideo,
				translationHover: (translations) => translations.pages.content.features.saveToWatchLaterButton.extras.saveVideo,
				translationProcessing: (translations) => translations.pages.content.features.saveToWatchLaterButton.extras.savingVideo
			});

			// A concurrent pass can add the button to this video while createActionButton awaits.
			if (video.querySelector(".yte-save-to-watch-later-button")) continue;

			const heading = video.querySelector("h3") as HTMLElement;
			const buttons = video.querySelector("button-view-model") as HTMLElement;
			if (heading && buttons) {
				heading.style.paddingRight = "40px";
				buttons.prepend(saveButton);
				Array.from(buttons.children).forEach((child) => {
					(child as HTMLElement).style.display = "inline-flex";
				});
			}
		}
	}

	async function observeVideos() {
		// Attach the observer before the first await. A check with an await gap lets two
		// concurrent setup runs attach two observers, and the first one leaks.
		if (!videosObserver) {
			const container = document.querySelector(containerSelector);
			if (container) {
				videosObserver = new MutationObserver(() => {
					void addButtonToVideoItems();
				});
				videosObserver.observe(container, { childList: true, subtree: true });
			}
		}

		await addButtonToVideoItems();
	}

	await observeVideos();
}

function teardownSaveToWatchLaterButtons() {
	if (videosObserver) {
		videosObserver.disconnect();
		videosObserver = null;
	}

	document.querySelectorAll(".yte-save-to-watch-later-button").forEach((saveButton) => {
		saveButton.closest("yt-lockup-view-model")!.querySelector("h3")!.style.paddingRight = "0";
		saveButton.remove();
	});
}

export default createFeature({
	...metadata,
	onDisable: () => {
		if (pageDisposeListener) {
			document.removeEventListener("yt-action", pageDisposeListener);
			pageDisposeListener = null;
		}

		teardownSaveToWatchLaterButtons();
	},
	onEnable: async () => {
		await setupSaveToWatchLaterButtons();
	},
	onNavigate: async () => {
		teardownSaveToWatchLaterButtons();
		await setupSaveToWatchLaterButtons();
	}
});
