import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

import { calculateRemainingTime } from "./utils";

export async function removeRemainingTimeDisplay() {
	const remainingTimeElement = await waitForElement("span#ytp-time-remaining");
	if (!remainingTimeElement) return;
	remainingTimeElement.remove();
	eventManager.removeEventListeners("remainingTime");
}
export async function setupRemainingTime() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_remaining_time }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!isWatchPage()) return;
	// If remaining time option is disabled, return
	if (!enable_remaining_time) return;
	// Get the player element
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	// If player element is not available, return
	if (!playerContainer) return;
	const timeDisplay = playerContainer.querySelector(".ytp-time-display > .ytp-time-wrapper > .ytp-time-contents");
	if (!timeDisplay) return;
	// Get the video element
	const videoElement = playerContainer.querySelector("video");
	// If video element is not available, return
	if (!videoElement) return;
	const playerVideoData = await playerContainer.getVideoData();
	const remainingTime = await calculateRemainingTime({ playerContainer, videoElement });
	const remainingTimeElementExists = (await waitForElement("span#ytp-time-remaining")) !== null;
	if (playerVideoData.isLive && !remainingTimeElementExists) return;
	const remainingTimeElement = (await waitForElement("span#ytp-time-remaining")) ?? document.createElement("span");
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
function playerTimeUpdateListener() {
	void (async () => {
		// Get the player element
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		// If player element is not available, return
		if (!playerContainer) return;
		// Get the video element
		const videoElement = playerContainer.querySelector("video");
		// If video element is not available, return
		if (!videoElement) return;
		// Get the remaining time element
		const remainingTimeElement = await waitForElement<HTMLSpanElement>("span#ytp-time-remaining");
		if (!remainingTimeElement) return;
		const remainingTime = await calculateRemainingTime({ playerContainer, videoElement });
		remainingTimeElement.textContent = remainingTime;
	})();
}
