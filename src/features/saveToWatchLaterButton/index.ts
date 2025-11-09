import { AiOutlineVideoCameraAdd } from "react-icons/ai";
import { Innertube } from "youtubei.js/web";

import { createActionButton } from "@/src/features/playlistManagementButtons/ActionButton";
import { isHomePage, isSubscriptionsPage, waitForSpecificMessage } from "@/src/utils/utilities";

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
const TRANSLATION_KEY_PREFIX = "settings.sections.saveToWatchLaterButton";

let videosObserver: MutationObserver | null = null;

export async function disableSaveToWatchLaterButton() {
	if (videosObserver) {
		videosObserver.disconnect();
		videosObserver = null;
	}

	document.querySelectorAll(".yte-save-to-watch-later-button").forEach((saveButton) => {
		saveButton.closest("yt-lockup-view-model")!.querySelector("h3")!.style.paddingRight = "0";
		saveButton.remove();
	});
}

export async function enableSaveToWatchLaterButton() {
	const {
		data: {
			options: { enable_save_to_watch_later_button }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");

	if (!enable_save_to_watch_later_button || (!isHomePage() && !isSubscriptionsPage())) {
		return;
	}

	document.addEventListener("yt-action", async (event) => {
		if ((event as CustomEvent).detail.actionName === "yt-prepare-page-dispose") {
			await disableSaveToWatchLaterButton();
		}
	});

	const youtube = await Innertube.create({
		cookie: document.cookie,
		fetch: (...args) => fetch(...args)
	});

	function addButtonToVideoItems() {
		document.querySelectorAll(`${CONTAINER} yt-lockup-view-model:not(:has(.yte-save-to-watch-later-button))`).forEach((video) => {
			const { contentId: videoId } = (video as YTLockupViewModel).rawProps.data();

			const saveButton = createActionButton({
				className: "yte-save-to-watch-later-button",
				featureName: "saveToWatchLaterButton",
				icon: AiOutlineVideoCameraAdd,
				onClick: async () => {
					await youtube.playlist.addVideos("WL", [videoId]);
					saveButton.closest("yt-lockup-view-model")!.querySelector("h3")!.style.paddingRight = "0";
					saveButton.style.display = "none";
				},
				translationError: `${TRANSLATION_KEY_PREFIX}.failedToSaveVideo`,
				translationHover: `${TRANSLATION_KEY_PREFIX}.saveVideo`,
				translationProcessing: `${TRANSLATION_KEY_PREFIX}.savingVideo`
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
