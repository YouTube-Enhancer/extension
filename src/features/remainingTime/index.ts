import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";
import { calculateRemainingTime } from "./utils";

function playerTimeUpdateListener() {
	void (async () => {
		// Get the player element
		const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		// If player element is not available, return
		if (!playerContainer) return;
		// Get the video element
		const videoElement = playerContainer.querySelector("video");
		// If video element is not available, return
		if (!videoElement) return;
		// Get the remaining time element
		const remainingTimeElement = document.querySelector<HTMLSpanElement>("span#ytp-time-remaining");
		if (!remainingTimeElement) return;
		const remainingTime = await calculateRemainingTime({ playerContainer, videoElement });
		remainingTimeElement.textContent = remainingTime;
	})();
}

export default createFeature({
	...metadata,
	onDisable: () => {
		const remainingTimeElement = document.querySelector("span#ytp-time-remaining");
		if (!remainingTimeElement) return;
		remainingTimeElement.remove();
		eventManager.removeEventListeners("remainingTime");
	},
	onEnable: async () => {
		// Get the player element
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player", 75);
		// If player element is not available, return
		if (!playerContainer) return;
		// Get the video element
		const [videoElement, remainingTimeElement] = await Promise.all([
			waitForElement<HTMLVideoElement>("video", playerContainer, 75),
			waitForElement<HTMLSpanElement>("span#ytp-time-remaining", 75, "optional")
		]);
		// If video element is not available, return
		if (!videoElement) return;
		const timeDisplay = playerContainer.querySelector<HTMLDivElement>(".ytp-time-display > .ytp-time-wrapper > .ytp-time-contents");
		if (!timeDisplay) return;
		const [playerVideoData, remainingTime] = await Promise.all([
			playerContainer.getVideoData(),
			calculateRemainingTime({ playerContainer, videoElement })
		]);
		if (playerVideoData.isLive) {
			if (remainingTimeElement) remainingTimeElement.remove();
			return;
		}
		const el =
			remainingTimeElement ??
			(() => {
				const span = document.createElement("span");
				span.id = "ytp-time-remaining";
				timeDisplay.appendChild(span);
				return span;
			})();
		el.textContent = remainingTime;
		eventManager.addEventListener(videoElement, "timeupdate", playerTimeUpdateListener, "remainingTime");
	}
});
