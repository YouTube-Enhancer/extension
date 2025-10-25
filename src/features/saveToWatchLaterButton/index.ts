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

const TRANSLATION_KEY_PREFIX = "settings.sections.saveToWatchLaterButton";

let videosObserver: MutationObserver | null = null;

export async function disableSaveToWatchLaterButton() {
	if (videosObserver) {
		videosObserver.disconnect();
		videosObserver = null;
	}

	document.querySelectorAll(".yte-save-to-watch-later-button").forEach((saveButton) => {
		removeSaveToWatchLaterButton(saveButton as HTMLElement);
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

	const youtube = await Innertube.create({
		cookie: document.cookie,
		fetch: (...args) => fetch(...args)
	});

	function addButtonToVideoItems() {
		document.querySelectorAll("yt-lockup-view-model:not(:has(.yte-save-to-watch-later-button))").forEach((video) => {
			const { contentId: videoId } = (video as YTLockupViewModel).rawProps.data();

			const saveButton = createActionButton({
				className: "yte-save-to-watch-later-button",
				featureName: "saveToWatchLaterButton",
				icon: AiOutlineVideoCameraAdd,
				onClick: async () => {
					await youtube.playlist.addVideos("WL", [videoId]);
					removeSaveToWatchLaterButton(saveButton);
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

	function observePlaylist() {
		addButtonToVideoItems();
		const container = document.querySelector("ytd-two-column-browse-results-renderer");
		if (container) {
			videosObserver = new MutationObserver(addButtonToVideoItems);
			videosObserver.observe(container, { childList: true, subtree: true });
		}
	}

	window.addEventListener("DOMContentLoaded", observePlaylist);
	if (document.readyState === "complete" || document.readyState === "interactive") {
		observePlaylist();
	}
}

function removeSaveToWatchLaterButton(button: HTMLElement) {
	const heading = button.closest("yt-lockup-view-model")!.querySelector("h3") as HTMLElement;
	heading.style.paddingRight = "0";
	button.style.display = "none";
}
