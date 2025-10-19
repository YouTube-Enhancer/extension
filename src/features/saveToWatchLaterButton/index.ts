import React from "react";
import { renderToString } from "react-dom/server";
import { AiOutlineVideoCameraAdd } from "react-icons/ai";
import { FaSpinner } from "react-icons/fa";
import { Innertube } from "youtubei.js/web";

import "./index.css";

import { createTooltip, isHomePage, isSubscriptionsPage, waitForSpecificMessage } from "@/src/utils/utilities";

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

			const saveButton = document.createElement("button");
			saveButton.innerHTML = renderToString(React.createElement(AiOutlineVideoCameraAdd, { color: "white", size: 18 }));
			saveButton.title = window.i18nextInstance?.t("settings.sections.saveToWatchLaterButton.save");
			saveButton.className = "yte-save-to-watch-later-button";
			saveButton.addEventListener("click", async () => {
				const { innerHTML: originalHTML } = saveButton;
				saveButton.disabled = true;
				saveButton.innerHTML = renderToString(React.createElement(FaSpinner, { color: "gray", size: 18 }));
				saveButton.classList.add("yte-spinning");
				try {
					saveButton.classList.add("yte-spinning");
					await youtube.playlist.addVideos("WL", [videoId]);
					removeSaveToWatchLaterButton(saveButton);
				} catch (error) {
					const { listener } = createTooltip({
						element: saveButton,
						featureName: "saveToWatchLaterButton",
						id: "yte-feature-saveToWatchLaterButton-tooltip",
						text: `${window.i18nextInstance?.t(`settings.sections.saveToWatchLaterButton.error`)}: ${error instanceof Error ? error.message : String(error)}`
					});
					listener();
				} finally {
					saveButton.disabled = false;
					saveButton.innerHTML = originalHTML;
					saveButton.classList.remove("yte-spinning");
				}
			});

			const buttons = video.querySelector("button-view-model");
			if (buttons) {
				const title = video.querySelector(".yt-lockup-metadata-view-model__title") as HTMLElement;
				const paddingRight = parseInt(getComputedStyle(title).paddingRight, 10);
				title.style.paddingRight = `${paddingRight + 40}px`;
				const buttonClasses = Array.from(buttons.children[0].classList).join(" ");
				saveButton.className += " " + buttonClasses;
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
	const title = button.closest("yt-lockup-view-model")!.querySelector(".yt-lockup-metadata-view-model__title") as HTMLElement;
	const paddingRight = parseInt(getComputedStyle(title).paddingRight, 10);
	title.style.paddingRight = `${paddingRight - 40}px`;
	button.style.display = "none";
}
