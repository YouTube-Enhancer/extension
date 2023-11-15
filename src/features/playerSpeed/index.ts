import type { YouTubePlayerDiv } from "@/src/@types";

import eventManager from "@/src/utils/EventManager";
import { browserColorLog, isShortsPage, isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

/**
 * Sets the player speed based on the given speed.
 *
 * @param playerSpeed - The playback speed to set.
 * @returns {Promise<void>} A promise that resolves once the player speed is set.
 */
export async function setPlayerSpeed(playerSpeed: number): Promise<void>;
/**
 * Sets the player speed based on the options received
 * It sets the playback speed if the option is enabled and a valid speed is specified.
 *
 * @param options - Options for setting the player speed.
 * @returns {Promise<void>} A promise that resolves once the player speed is set.
 */
export async function setPlayerSpeed(): Promise<void>;
export async function setPlayerSpeed(input?: number): Promise<void> {
	let playerSpeed = 1;
	let enablePlayerSpeed = true;
	// If the input is a number, set the player speed to the given number
	if (input === undefined) {
		// Wait for the "options" message from the content script
		const optionsData = await waitForSpecificMessage("options", "request_data", "content");
		if (!optionsData) return;
		const {
			data: { options }
		} = optionsData;
		({ enable_forced_playback_speed: enablePlayerSpeed, player_speed: playerSpeed } = options);
	} else if (typeof input === "number") {
		playerSpeed = input;
	}
	// If the player speed is not specified, return
	if (!playerSpeed) return;
	// If forced playback speed option is disabled, return
	if (!enablePlayerSpeed) return;
	// Get the player element
	const playerContainer = isWatchPage()
		? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
		: isShortsPage()
		  ? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
		  : null;
	// If player element is not available, return
	if (!playerContainer) return;
	const video = document.querySelector("video.html5-main-video") as HTMLVideoElement | null;

	// If setPlaybackRate method is not available in the player, return
	if (!playerContainer.setPlaybackRate) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	// Log the message indicating the player speed being set
	browserColorLog(`Setting player speed to ${playerSpeed}`, "FgMagenta");

	// Set the playback speed
	playerContainer.setPlaybackRate(playerSpeed);
	// Set the video playback speed
	if (video) video.playbackRate = playerSpeed;
}
// Restore the player speed to the last saved player speed
export function restorePlayerSpeed() {
	// Get the saved player speed from the local storage
	const playerSpeed = window.localStorage.getItem("playerSpeed");
	// If the player speed is not available, return
	if (!playerSpeed) return;
	// Get the player element
	const playerContainer = isWatchPage()
		? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
		: isShortsPage()
		  ? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
		  : null;
	const video = document.querySelector("video.html5-main-video") as HTMLVideoElement | null;
	// If player element is not available, return
	if (!playerContainer) return;
	// If setPlaybackRate method is not available in the player, return
	if (!playerContainer.setPlaybackRate) return;
	if (!video) return;
	// Log the message indicating the player speed being set
	browserColorLog(`Restoring player speed to ${playerSpeed}`, "FgMagenta");
	// Set the playback speed
	playerContainer.setPlaybackRate(Number(playerSpeed));
	// Set the video playback speed
	video.playbackRate = Number(playerSpeed);
}
export function setupPlaybackSpeedChangeListener() {
	const settingsMenu = document.querySelector("div.ytp-settings-menu:not(#yte-feature-menu)");

	// Function to handle the playback speed click event
	function handlePlaybackSpeedClick(node: HTMLDivElement): void {
		// Extract the playback speed value
		const speedValue = node.textContent?.trim();
		// If the playback speed is not available, return
		if (!speedValue) return;
		const playerSpeed = speedValue === "Normal" ? 1 : Number(speedValue);
		window.localStorage.setItem("playerSpeed", String(playerSpeed));
	}

	// Create an observer instance
	const observer = new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === "childList") {
				const titleElement: HTMLSpanElement | null = document.querySelector("div.ytp-panel > div.ytp-panel-header > span.ytp-panel-title");
				// TODO: fix this it relies on the language being English
				if (titleElement && titleElement.textContent && titleElement.textContent.includes("Playback speed")) {
					const menuItems: NodeListOf<HTMLDivElement> = document.querySelectorAll("div.ytp-panel-menu div.ytp-menuitem");
					menuItems.forEach((node: HTMLDivElement) => {
						eventManager.addEventListener(node, "click", () => handlePlaybackSpeedClick(node), "playerSpeed");
					});
				} else {
					const menuItems: NodeListOf<HTMLDivElement> = document.querySelectorAll("div.ytp-panel-menu div.ytp-menuitem");
					menuItems.forEach((node: HTMLDivElement) => {
						eventManager.removeEventListener(node, "click", "playerSpeed");
					});
				}
			}
		}
	});

	const config: MutationObserverInit = { childList: true, subtree: true };

	if (settingsMenu) {
		observer.observe(settingsMenu, config);
	}
}
