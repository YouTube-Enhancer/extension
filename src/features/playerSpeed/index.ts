import type { YouTubePlayerDiv } from "@/src/types";

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
		? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage()
		  ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		  : null;
	// If player element is not available, return
	if (!playerContainer) return;
	const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");

	// If setPlaybackRate method is not available in the player, return
	if (!playerContainer.setPlaybackRate) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	// Log the message indicating the player speed being set
	browserColorLog(`Setting player speed to ${playerSpeed}`, "FgMagenta");

	// Set the playback speed
	void playerContainer.setPlaybackRate(playerSpeed);
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
		? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage()
		  ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		  : null;
	const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	// If player element is not available, return
	if (!playerContainer) return;
	// If setPlaybackRate method is not available in the player, return
	if (!playerContainer.setPlaybackRate) return;
	if (!video) return;
	// Log the message indicating the player speed being set
	browserColorLog(`Restoring player speed to ${playerSpeed}`, "FgMagenta");
	// Set the playback speed
	void playerContainer.setPlaybackRate(Number(playerSpeed));
	// Set the video playback speed
	video.playbackRate = Number(playerSpeed);
}
export function setupPlaybackSpeedChangeListener() {
	const settingsPanelMenu = document.querySelector("div.ytp-settings-menu:not(#yte-feature-menu)");
	const speedMenuItemClickListener = (event: Event) => {
		const { target: speedMenuItem } = event as Event & { target: HTMLDivElement };
		if (!speedMenuItem) return;
		const { textContent: speedValue } = speedMenuItem;
		// If the playback speed is not available, return
		if (!speedValue) return;
		const speedValueRegex = /(?<!\d\.)([0-1](\.\d+)?|2)(?![\d.])/;
		let playerSpeed: number = 1;
		if (speedValueRegex.test(speedValue)) {
			const speedValueMatch = speedValue.match(speedValueRegex);
			if (speedValueMatch) {
				playerSpeed = Number(speedValueMatch[1]);
			}
		}
		window.localStorage.setItem("playerSpeed", String(playerSpeed));
	};

	// Create an observer instance
	const playerSpeedMenuObserver = new MutationObserver((mutationsList: MutationRecord[]) => {
		mutationsList.forEach((mutation) => {
			const { target: targetElement } = mutation as MutationRecord & { target: HTMLDivElement };

			// Check if the target element has the desired structure
			const panelHeader: HTMLDivElement | null = targetElement.querySelector("div.ytp-panel > div.ytp-panel-header");
			const panelMenu: HTMLDivElement | null = targetElement.querySelector("div.ytp-panel > div.ytp-panel-menu");
			const menuItems = panelMenu?.querySelectorAll("div.ytp-menuitem");
			if (panelHeader && panelMenu && menuItems && menuItems.length === 8) {
				menuItems.forEach((menuItem) => {
					eventManager.addEventListener(menuItem as HTMLDivElement, "click", speedMenuItemClickListener, "playerSpeed");
				});
			}
		});
	});
	const customSpeedSliderObserver = new MutationObserver((mutationsList: MutationRecord[]) => {
		mutationsList.forEach((mutation) => {
			const { target: targetElement } = mutation as MutationRecord & { target: HTMLDivElement };
			const speedValue = targetElement.getAttribute("aria-valuenow");
			// If the playback speed is not available, return
			if (!speedValue) return;
			const playerSpeed = parseFloat(speedValue);
			window.localStorage.setItem("playerSpeed", String(playerSpeed));
		});
	});
	const config: MutationObserverInit = { childList: true, subtree: true };

	if (settingsPanelMenu) {
		playerSpeedMenuObserver.observe(settingsPanelMenu, config);
		customSpeedSliderObserver.observe(settingsPanelMenu, {
			attributeFilter: ["aria-valuenow"],
			attributes: true,
			childList: true,
			subtree: true
		});
		const menuItems = [...document.querySelectorAll('div.ytp-settings-menu:not(#yte-feature-menu) > .ytp-panel > .ytp-panel-menu [role="menuitem"]')];
		const speedMenuItem = menuItems.find(
			(el) =>
				el.children[0].innerHTML ===
				`<svg height="24" viewBox="0 0 24 24" width="24"><path d="M10,8v8l6-4L10,8L10,8z M6.3,5L5.7,4.2C7.2,3,9,2.2,11,2l0.1,1C9.3,3.2,7.7,3.9,6.3,5z            M5,6.3L4.2,5.7C3,7.2,2.2,9,2,11 l1,.1C3.2,9.3,3.9,7.7,5,6.3z            M5,17.7c-1.1-1.4-1.8-3.1-2-4.8L2,13c0.2,2,1,3.8,2.2,5.4L5,17.7z            M11.1,21c-1.8-0.2-3.4-0.9-4.8-2 l-0.6,.8C7.2,21,9,21.8,11,22L11.1,21z            M22,12c0-5.2-3.9-9.4-9-10l-0.1,1c4.6,.5,8.1,4.3,8.1,9s-3.5,8.5-8.1,9l0.1,1 C18.2,21.5,22,17.2,22,12z" fill="white"></path></svg>`
		) as HTMLDivElement | undefined;
		if (!speedMenuItem) return;
		const {
			children: [, , speedMenuItemContent]
		} = speedMenuItem;
		if (!speedMenuItemContent) return;
		const { textContent: speedValue } = speedMenuItem;
		// If the playback speed is not available, return
		if (!speedValue) return;
		const playerSpeed = isNaN(Number(speedValue)) ? 1 : Number(speedValue);
		window.localStorage.setItem("playerSpeed", String(playerSpeed));
	}
}
