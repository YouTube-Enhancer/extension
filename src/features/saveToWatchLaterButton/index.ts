import { AiOutlineVideoCameraAdd } from "react-icons/ai";
import { Innertube } from "youtubei.js/web";

import type { YtActionEvent } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { createActionButton } from "@/src/features/playlistManagementButtons/ActionButton";

import { metadata } from "./index.metadata";

interface YTLockupViewModel extends HTMLElement {
	rawProps: {
		data: () => {
			contentId: string;
		};
	};
}

if (window.trustedTypes && !window.trustedTypes.defaultPolicy) {
	window.trustedTypes.createPolicy("default", {
		createHTML: (input: string) => input
	});
}

const CONTAINER = "ytd-two-column-browse-results-renderer:is([page-subtype='home'], [page-subtype='subscriptions'])";

let videosObserver: MutationObserver | null = null;
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
		document.addEventListener("yt-action", (event) => {
			if ((event as YtActionEvent).detail.actionName === "yt-prepare-page-dispose") {
				void (async () => {
					await registry.updateFeatureEnabledState("saveToWatchLaterButton", false, config);
				})();
			}
		});

		const youtube = await Innertube.create({
			cookie: document.cookie,
			fetch: (...args) => fetch(...args)
		});

		function addButtonToVideoItems() {
			document.querySelectorAll(`${CONTAINER} yt-lockup-view-model:not(:has(.yte-save-to-watch-later-button))`).forEach((video) => {
				const ytLockupViewModel = video as YTLockupViewModel;
				if (
					!ytLockupViewModel.rawProps ||
					(ytLockupViewModel.rawProps && !ytLockupViewModel.rawProps.data) ||
					(ytLockupViewModel.rawProps && ytLockupViewModel.rawProps.data && typeof ytLockupViewModel.rawProps.data !== "function")
				)
					return;
				const { contentId: videoId } = ytLockupViewModel.rawProps.data();

				const saveButton = createActionButton({
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
			});
		}

		function observeVideos() {
			if (videosObserver) {
				return;
			}

			addButtonToVideoItems();
			const container = document.querySelector(CONTAINER);
			if (container) {
				videosObserver = new MutationObserver(addButtonToVideoItems);
				videosObserver.observe(container, { childList: true, subtree: true });
			}
		}

		observeVideos();
	}
});
