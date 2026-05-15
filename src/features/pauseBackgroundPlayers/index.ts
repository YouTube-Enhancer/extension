import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { browserColorLog } from "@/src/utils/logging";
import { sendContentToBackgroundMessage } from "@/src/utils/messaging";

import { metadata } from "./index.metadata";

const PauseBackgroundPlayers = () => {
	sendContentToBackgroundMessage("pauseBackgroundPlayers").catch((error) => {
		throw new Error(`Failed to pause background players: ${error}`);
	});
};
export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "live"] },
	onDisable: () => {
		const videoPlayerContainer: HTMLElement | null = document.querySelector(".html5-main-video");
		if (videoPlayerContainer) {
			videoPlayerContainer.removeEventListener("playing", PauseBackgroundPlayers);
		}
		browserColorLog("Disabling pauseBackgroundPlayers", "FgMagenta");
	},
	onEnable: () => {
		// ignore home page and channel pages
		if (window.location.href.match(/^https?:\/\/(?:www\.)?youtube\.com(\/?|\/channel\/.+|\/\@.+)$/gm)) return;
		browserColorLog("Enabling pauseBackgroundPlayers", "FgMagenta");
		let videoPlayerContainer: HTMLVideoElement | null = null;
		if (!videoPlayerContainer) {
			videoPlayerContainer = document.querySelector(".html5-main-video");
		}
		function detectPlaying() {
			if (videoPlayerContainer) {
				videoPlayerContainer.addEventListener("playing", PauseBackgroundPlayers);
			}
		}
		let debounceTimeout: Nullable<number> = null;
		const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
			if (debounceTimeout) clearTimeout(debounceTimeout);
			// @ts-expect-error - doesn't recognize browser environment properly
			debounceTimeout = setTimeout(() => {
				for (const mutation of mutationsList) {
					if (mutation.addedNodes.length) {
						detectPlaying();
					}
				}
			}, 100);
		});
		if (videoPlayerContainer) {
			observer.observe(videoPlayerContainer, { childList: true, subtree: true });
		}
		if (!videoPlayerContainer?.paused) {
			PauseBackgroundPlayers();
		}
		detectPlaying();
	}
});
