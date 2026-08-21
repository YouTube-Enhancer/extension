import { AiOutlineVideoCameraAdd } from "react-icons/ai";

import type { configuration, Nullable, YtActionEvent } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { createActionButton } from "@/src/features/playlistManagementButtons/ActionButton";
import { getCurrentPageType } from "@/src/utils/url";

import { metadata } from "./index.metadata";

interface YTLockupViewModel extends HTMLElement {
	rawProps: {
		data: () => {
			contentId: string;
		};
	};
}

let videosObserver: Nullable<MutationObserver> = null;

async function setupSaveToWatchLaterButtons(config: configuration["saveToWatchLaterButton"]) {
	document.addEventListener("yt-action", (event) => {
		if ((event as YtActionEvent).detail.actionName === "yt-prepare-page-dispose") {
			void (async () => {
				await registry.updateFeatureEnabledState("saveToWatchLaterButton", false, config);
			})();
		}
	});

	const { Innertube } = await import("youtubei.js/web");
	const youtube = await Innertube.create({
		cookie: document.cookie,
		fetch: (...args) => fetch(...args)
	});

	const containerSelector = `ytd-two-column-browse-results-renderer[page-subtype='${await getCurrentPageType()}']`;

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
				className: "yte-save-to-watch-later-button",
				featureName: "saveToWatchLaterButton",
				icon: AiOutlineVideoCameraAdd,
				onClick: async () => {
					await youtube.playlist.addVideos("WL", [videoId]);
					saveButton.closest("yt-lockup-view-model")!.querySelector("h3")!.style.paddingRight = "0";
					saveButton.style.display = "none";
				},
				translationError: (translations) => translations.pages.content.features.saveToWatchLaterButton.extras.failedToSaveVideo,
				translationHover: (translations) => translations.pages.content.features.saveToWatchLaterButton.extras.saveVideo,
				translationProcessing: (translations) => translations.pages.content.features.saveToWatchLaterButton.extras.savingVideo
			});

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
		if (videosObserver) {
			return;
		}

		await addButtonToVideoItems();
		const container = document.querySelector(containerSelector);
		if (container) {
			videosObserver = new MutationObserver(() => {
				void addButtonToVideoItems();
			});
			videosObserver.observe(container, { childList: true, subtree: true });
		}
	}

	await observeVideos();
}

export default createFeature({
	...metadata,
	onDisable: () => {
		if (videosObserver) {
			videosObserver.disconnect();
			videosObserver = null;
		}

		document.querySelectorAll(".yte-save-to-watch-later-button").forEach((saveButton) => {
			saveButton.closest("yt-lockup-view-model")!.querySelector("h3")!.style.paddingRight = "0";
			saveButton.remove();
		});
	},
	onEnable: async (config) => {
		await setupSaveToWatchLaterButtons(config);
	},
	onNavigate: async () => {
		if (videosObserver) {
			videosObserver.disconnect();
			videosObserver = null;
		}

		await setupSaveToWatchLaterButtons(registry.configManager.getLast("saveToWatchLaterButton"));
	}
});
