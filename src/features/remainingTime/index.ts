import { isShortsPage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";
import type { YouTubePlayerDiv } from "@/src/@types";
import { calculateRemainingTime } from "./utils";
import eventManager from "@/src/utils/EventManager";
async function playerTimeUpdateListener() {
	// Get the player element
	const playerContainer = isWatchPage()
		? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
		: isShortsPage()
		? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
		: null;

	// If player element is not available, return
	if (!playerContainer) return;

	// Get the video element
	const videoElement = playerContainer.querySelector("video") as HTMLVideoElement | null;

	// If video element is not available, return
	if (!videoElement) return;
	// Get the remaining time element
	const remainingTimeElement = document.querySelector("span#ytp-time-remaining");
	if (!remainingTimeElement) return;
	const remainingTime = await calculateRemainingTime({ videoElement, playerContainer });
	remainingTimeElement.textContent = remainingTime;
}
export async function setupRemainingTime() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_remaining_time } = options;
	// If remaining time option is disabled, return
	if (!enable_remaining_time) return;
	const timeDisplay = document.querySelector(".ytp-time-display > span:nth-of-type(2)");
	if (!timeDisplay) return;
	// Get the player element
	const playerContainer = isWatchPage()
		? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
		: isShortsPage()
		? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
		: null;
	// If player element is not available, return
	if (!playerContainer) return;
	// Get the video element
	const videoElement = playerContainer.querySelector("video") as HTMLVideoElement | null;
	// If video element is not available, return
	if (!videoElement) return;
	const remainingTime = await calculateRemainingTime({ videoElement, playerContainer });
	const remainingTimeElementExists = document.querySelector("span#ytp-time-remaining") !== null;
	const remainingTimeElement = document.querySelector("span#ytp-time-remaining") ?? document.createElement("span");
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
