import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { isShortsPage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

import { calculateRemainingTime } from "./utils";

function playerTimeUpdateListener() {
	void (async () => {
		// Get the player element
		const playerContainer =
			isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
			: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
			: null;
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
export async function setupRemainingTime() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_remaining_time }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If remaining time option is disabled, return
	if (!enable_remaining_time) return;
	const timeDisplay = document.querySelector(".ytp-time-display > span:nth-of-type(2)");
	if (!timeDisplay) return;
	// Get the player element
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null;
	// If player element is not available, return
	if (!playerContainer) return;
	// Get the video element
	const videoElement = playerContainer.querySelector("video");
	// If video element is not available, return
	if (!videoElement) return;
	const playerVideoData = await playerContainer.getVideoData();
	const remainingTime = await calculateRemainingTime({ playerContainer, videoElement });
	const remainingTimeElementExists = document.querySelector("span#ytp-time-remaining") !== null;
	if (playerVideoData.isLive && !remainingTimeElementExists) return;
	const remainingTimeElement = document.querySelector("span#ytp-time-remaining") ?? document.createElement("span");
	// If the video is live return
	if (playerVideoData.isLive && remainingTimeElementExists) {
		remainingTimeElement.remove();
	}
	if (!remainingTimeElementExists) {
		remainingTimeElement.id = "ytp-time-remaining";
		remainingTimeElement.textContent = remainingTime;
		timeDisplay.insertAdjacentElement("beforeend", remainingTimeElement);
	}
	eventManager.addEventListener(videoElement, "timeupdate", playerTimeUpdateListener, "remainingTime");
}
export function removeRemainingTimeDisplay() {
	const remainingTimeElement = document.querySelector("span#ytp-time-remaining");
	if (!remainingTimeElement) return;
	remainingTimeElement.remove();
	eventManager.removeEventListeners("remainingTime");
}
