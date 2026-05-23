import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { waitForElement } from "@/src/utils/dom/wait";
import { browserColorLog } from "@/src/utils/logging";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";

const speedValueRegex = /(\d+(?:\.\d+)?)/;

export async function setPlayerSpeed(speed: number) {
	const playerContainer =
		isWatchPage() ? await waitForElement<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("div#shorts-player")
		: null;
	// If player element is not available, return
	if (!playerContainer) return;
	// If setPlaybackRate method is not available in the player, return
	if (!playerContainer.setPlaybackRate) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	const video = await waitForElement<HTMLVideoElement>("video.html5-main-video");
	if (!video) return;
	// Set the playback speed
	await playerContainer.setPlaybackRate(speed);
	// Set the video playback speed
	if (video) video.playbackRate = speed;
}
async function getPlaybackSpeedPerClick() {
	const {
		data: {
			options: {
				playbackSpeedButtons: { speed }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	return speed;
}
function setupPlaybackSpeedChangeListener() {
	const documentObserver = new MutationObserver(() => {
		const menu = document.querySelector<HTMLDivElement>(settingsPanelMenuSelector);
		if (menu) {
			documentObserver.disconnect();
			setupMenuObserver(menu);
		}
	});
	documentObserver.observe(document.body, { childList: true, subtree: true });
	function setupMenuObserver(settingsPanelMenu: HTMLDivElement) {
		let lastSpeed: Nullable<number> = null;
		const updateStoredSpeed = (speed: number) => {
			if (speed === lastSpeed) return;
			lastSpeed = speed;
			void updateSpeedButtons(speed);
			const stateAPI = registry.stateManager.getStateAPI("playerSpeed");
			stateAPI.setState((prev) => ({ ...prev, playbackSpeed: speed }));
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
}
async function updatePlaybackSpeedButtons(currentSpeed: number) {
	const playbackSpeedPerClick = await getPlaybackSpeedPerClick();
	await updatePlaybackSpeedButtonTooltips(currentSpeed, playbackSpeedPerClick);
}

export default createFeature({
	...metadata,
	onConfigChange: async ({ enabled, speed }) => {
		if (!enabled) return;
		await setPlayerSpeed(speed);
		await updatePlaybackSpeedButtons(speed);
	},
	onDisable: async () => {
		// Get the saved player speed from the local storage
		const speed = registry.stateManager.getStateAPI("playerSpeed").getState()?.playbackSpeed ?? 1;
		// Log the message indicating the player speed being set
		browserColorLog(`Restoring player speed to ${speed}`, "FgMagenta");
		await setPlayerSpeed(speed);
		await updatePlaybackSpeedButtons(speed);
	},
	onEnable: async ({ speed }) => {
		// Log the message indicating the player speed being set
		browserColorLog(`Setting player speed to ${speed}`, "FgMagenta");
		await setPlayerSpeed(speed);
		await updatePlaybackSpeedButtons(speed);
	},
	onInit: setupPlaybackSpeedChangeListener,
	persistState: true,
	state: {
		playbackSpeed: 1
	}
});
async function updateSpeedButtons(playerSpeed: number) {
	await updatePlaybackSpeedButtons(playerSpeed);
}
