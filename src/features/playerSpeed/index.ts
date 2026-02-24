import type { Nullable, YouTubePlayerDiv } from "@/src/types";

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
export async function setupPlaybackSpeedChangeListener() {
	const settingsPanelMenu = await waitForElement<HTMLDivElement>("div.ytp-settings-menu:not(#yte-feature-menu)");
	if (!settingsPanelMenu) return;
	let lastSpeed: Nullable<number> = null;
	const updateStoredSpeed = (speed: number) => {
		if (speed === lastSpeed) return;
		lastSpeed = speed;
		void updateSpeedButtons(speed);
		window.localStorage.setItem("playerSpeed", String(speed));
	};
	const parseSpeed = (text: Nullable<string>): Nullable<number> => {
		if (!text) return null;
		const match = text.match(speedValueRegex);
		return match ? Number(match[1]) : null;
	};
	const handleSliderChange = (slider: HTMLInputElement) => {
		const speed = parseSpeed(slider.value);
		if (speed !== null) updateStoredSpeed(speed);
	};
	const handlePresetClick = (button: HTMLButtonElement) => {
		const span = button.querySelector("span");
		const speed = parseSpeed(span?.textContent ?? null);
		if (speed !== null) updateStoredSpeed(speed);
	};
	const panelObserver = new MutationObserver(() => {
		const speedPanel = settingsPanelMenu.querySelector<HTMLDivElement>(".ytp-variable-speed-panel-content");
		if (!speedPanel) return;
		// Slider
		const slider = speedPanel.querySelector<HTMLInputElement>(".ytp-input-slider.ytp-speedslider");
		if (slider) {
			eventManager.removeEventListener(slider, "input", "playerSpeed");
			eventManager.addEventListener(slider, "input", () => handleSliderChange(slider), "playerSpeed");
		}
		// Preset buttons
		const presets = speedPanel.querySelectorAll<HTMLButtonElement>(".ytp-variable-speed-panel-preset-button");
		presets.forEach((preset) => {
			eventManager.removeEventListener(preset, "click", "playerSpeed");
			eventManager.addEventListener(preset, "click", () => handlePresetClick(preset), "playerSpeed");
		});
		// Display span (catch programmatic updates)
		const displaySpan = speedPanel.querySelector<HTMLSpanElement>(".ytp-variable-speed-panel-display span, .ytp-speedslider-text");
		const speed = parseSpeed(displaySpan?.textContent ?? null);
		if (speed !== null) updateStoredSpeed(speed);
	});
	panelObserver.observe(settingsPanelMenu, { characterData: true, childList: true, subtree: true });
	// Reset lastSpeed when menu closes
	new MutationObserver(() => {
		if (settingsPanelMenu.style.display === "none") lastSpeed = null;
	}).observe(settingsPanelMenu, { attributeFilter: ["style"], attributes: true });
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
