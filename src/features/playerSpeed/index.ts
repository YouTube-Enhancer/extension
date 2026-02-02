import type { YouTubePlayerDiv } from "@/src/types";

import { calculatePlaybackButtonSpeed, updatePlaybackSpeedButtonTooltip } from "@/src/features/playbackSpeedButtons";
import eventManager from "@/src/utils/EventManager";
import { browserColorLog, isShortsPage, isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

// Restore the player speed to the last saved player speed
export async function restorePlayerSpeed() {
	// Get the saved player speed from the local storage
	const playerSpeed = Number(window.localStorage.getItem("playerSpeed") ?? "1");
	// If the player speed is not available, return
	if (!playerSpeed) return;
	// Get the player element
	const playerContainer =
		isWatchPage() ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
		: null;
	// If player element is not available, return
	if (!playerContainer) return;
	// If setPlaybackRate method is not available in the player, return
	if (!playerContainer.setPlaybackRate) return;
	const video = await waitForElement<HTMLVideoElement>("video.html5-main-video");
	if (!video) return;
	// Log the message indicating the player speed being set
	browserColorLog(`Restoring player speed to ${playerSpeed}`, "FgMagenta");
	// Set the playback speed
	void playerContainer.setPlaybackRate(playerSpeed);
	// Set the video playback speed
	video.playbackRate = playerSpeed;
}
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
		({
			data: {
				options: { enable_forced_playback_speed: enablePlayerSpeed, player_speed: playerSpeed }
			}
		} = await waitForSpecificMessage("options", "request_data", "content"));
	} else if (typeof input === "number") {
		playerSpeed = input;
	}
	if (!playerSpeed || !enablePlayerSpeed) return;
	const playerContainer =
		isWatchPage() ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
		: null;
	// If player element is not available, return
	if (!playerContainer) return;
	const video = await waitForElement<HTMLVideoElement>("video.html5-main-video");
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
const speedValueRegex = /(\d+(?:\.\d+)?)/;
const speedMenuItemSelector =
	".ytp-menuitem:has(.ytp-menuitem-icon svg path[d='M12 1c1.44 0 2.87.28 4.21.83a11 11 0 0 1 3.45 2.27l-1.81 1.05A9 9 0 0 0 3 12a9 9 0 0 0 18-.00l-.01-.44a8.99 8.99 0 0 0-.14-1.20l1.81-1.05A11.00 11.00 0 0 1 10.51 22.9 11 11 0 0 1 12 1Zm7.08 6.25-7.96 3.25a1.74 1.74 0 1 0 1.73 2.99l6.8-5.26a.57.57 0 0 0-.56-.98Z'])";
export async function setupPlaybackSpeedChangeListener() {
	const settingsPanelMenu = await waitForElement<HTMLDivElement>("div.ytp-settings-menu:not(#yte-feature-menu)");
	let regularMenuProcessed = false; // Only process the main menu once per open
	const readSpeedFromMainMenuItem = async () => {
		await new Promise(requestAnimationFrame);
		const speedMenuItem = document.querySelector<HTMLDivElement>(speedMenuItemSelector);
		if (!speedMenuItem) return;
		const content = speedMenuItem.querySelector<HTMLDivElement>(".ytp-menuitem-content")?.textContent ?? null;
		const match = content?.match(speedValueRegex);
		const playerSpeed = match ? Number(match[1]) : 1; // Default to 1 for Normal
		await updateSpeedButtons(playerSpeed);
		window.localStorage.setItem("playerSpeed", String(playerSpeed));
	};
	const extractSpeed = (text: null | string, isChecked = false): null | number => {
		if (!text) return null;
		const match = text.match(speedValueRegex);
		if (match) return Number(match[1]);
		if (isChecked) return 1; // Normal
		return null;
	};
	const isPlaybackSpeedMenu = (panelMenu: HTMLDivElement) =>
		!!panelMenu.closest(".ytp-settings-menu")?.querySelector(".ytp-speed-slider-menu-footer");
	const speedMenuItemClickListener = async (event: Event) => {
		const menuItem = (event.target as HTMLElement).closest<HTMLDivElement>("div.ytp-menuitem");
		if (!menuItem) return;
		const label = menuItem.querySelector<HTMLDivElement>(".ytp-menuitem-label")?.textContent ?? null;
		const isChecked = menuItem.getAttribute("aria-checked") === "true";
		const playerSpeed = extractSpeed(label, isChecked);
		if (!playerSpeed) return;
		await updateSpeedButtons(playerSpeed);
		window.localStorage.setItem("playerSpeed", String(playerSpeed));
	};
	const playerSpeedMenuObserver = new MutationObserver(async (mutationsList) => {
		for (const mutation of mutationsList) {
			const targetElement = mutation.target as HTMLDivElement;
			const panelMenu = targetElement.querySelector<HTMLDivElement>("div.ytp-panel > div.ytp-panel-menu");
			if (!panelMenu) continue;
			// Handle regular menu (main menu) once per open
			if (!regularMenuProcessed && panelMenu.querySelector(speedMenuItemSelector)) {
				regularMenuProcessed = true;
				await readSpeedFromMainMenuItem();
			}
			if (!isPlaybackSpeedMenu(panelMenu)) continue;
			const menuItems = panelMenu.querySelectorAll<HTMLDivElement>("div.ytp-menuitem");
			const checkedItem = panelMenu.querySelector<HTMLDivElement>('div.ytp-menuitem[aria-checked="true"]');
			const checkedLabel = checkedItem?.querySelector<HTMLDivElement>(".ytp-menuitem-label")?.textContent ?? null;
			const checkedSpeed = extractSpeed(checkedLabel, checkedItem?.getAttribute("aria-checked") === "true");
			if (checkedSpeed) {
				await updateSpeedButtons(checkedSpeed);
				window.localStorage.setItem("playerSpeed", String(checkedSpeed));
			}
			menuItems.forEach((menuItem) => {
				eventManager.removeEventListener(menuItem, "click", "playerSpeed");
				eventManager.addEventListener(menuItem, "click", speedMenuItemClickListener, "playerSpeed");
			});
		}
	});
	const customSpeedSliderObserver = new MutationObserver(async (mutationsList) => {
		for (const mutation of mutationsList) {
			const targetElement = mutation.target as HTMLDivElement;
			if (!targetElement.matches(".ytp-speedslider-text")) continue;
			const playerSpeed = parseFloat(targetElement.textContent ?? "");
			if (!playerSpeed) return;
			await updateSpeedButtons(playerSpeed);
			window.localStorage.setItem("playerSpeed", String(playerSpeed));
		}
	});
	if (settingsPanelMenu) {
		playerSpeedMenuObserver.observe(settingsPanelMenu, {
			attributeFilter: ["style"],
			attributes: true,
			childList: true,
			subtree: true
		});
		customSpeedSliderObserver.observe(settingsPanelMenu, {
			attributeFilter: ["aria-valuenow"],
			attributes: true,
			childList: true,
			subtree: true
		});
		new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				const targetElement = mutation.target as HTMLDivElement;
				if (targetElement === settingsPanelMenu && targetElement.style.display === "none") {
					// Reset the flag when the menu is closed
					regularMenuProcessed = false;
				}
			}
		}).observe(settingsPanelMenu, { attributeFilter: ["style"], attributes: true });
	}
}
async function updateSpeedButtons(playerSpeed: number) {
	const {
		data: {
			options: { playback_buttons_speed: playbackSpeedPerClick }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	await updatePlaybackSpeedButtonTooltip("increasePlaybackSpeedButton", calculatePlaybackButtonSpeed(playerSpeed, playbackSpeedPerClick, "increase"));
	await updatePlaybackSpeedButtonTooltip("decreasePlaybackSpeedButton", calculatePlaybackButtonSpeed(playerSpeed, playbackSpeedPerClick, "decrease"));
}
