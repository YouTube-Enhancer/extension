import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { browserColorLog } from "@/src/utils/logging";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";

const speedValueRegex = /(\d+(?:\.\d+)?)/;

export async function setPlayerSpeed(speed: number) {
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null;
	if (!playerContainer) return;
	if (!playerContainer.setPlaybackRate) return;
	const playerVideoData = await playerContainer.getVideoData();
	if (playerVideoData.isLive) return;
	const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!video) return;
	await playerContainer.setPlaybackRate(speed);
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
function makePlayerSpeedTask(speed: number): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		const playerContainer =
			isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
			: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
			: null;
		if (!playerContainer || !playerContainer.setPlaybackRate) return false;
		const playerVideoData = await playerContainer.getVideoData();
		if (playerVideoData.isLive) return true;
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		if (!video) return false;
		await playerContainer.setPlaybackRate(speed);
		video.playbackRate = speed;
		return true;
	};
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
			const stateAPI = registry.stateManager.getStateAPI(metadata.id);
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
				eventManager.removeEventListener(slider, "input", metadata.id);
				eventManager.addEventListener(slider, "input", () => handleSliderChange(slider), metadata.id);
			}
			// Preset buttons
			const presets = speedPanel.querySelectorAll<HTMLButtonElement>(".ytp-variable-speed-panel-preset-button");
			presets.forEach((preset) => {
				eventManager.removeEventListener(preset, "click", metadata.id);
				eventManager.addEventListener(preset, "click", () => handlePresetClick(preset), metadata.id);
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
	onDisable: () => {
		const speed = registry.stateManager.getStateAPI(metadata.id).getState()?.playbackSpeed ?? 1;
		browserColorLog(`Restoring player speed to ${speed}`, "FgMagenta");
		void registry.playerManager.executeWithRetries(metadata.id, [makePlayerSpeedTask(speed)], ["restoreSpeed"], {
			maxAttempts: 10,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: true
		});
		void updatePlaybackSpeedButtons(speed);
	},
	onEnable: ({ speed }) => {
		browserColorLog(`Setting player speed to ${speed}`, "FgMagenta");
		void registry.playerManager.executeWithRetries(metadata.id, [makePlayerSpeedTask(speed)], ["setSpeed"], {
			maxAttempts: 10,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: true
		});
		void updatePlaybackSpeedButtons(speed);
	},
	onInit: setupPlaybackSpeedChangeListener,
	onNavigate: ({ speed }) => {
		browserColorLog(`Setting player speed to ${speed} (navigation)`, "FgMagenta");
		void registry.playerManager.executeWithRetries(metadata.id, [makePlayerSpeedTask(speed)], ["setSpeed"], {
			maxAttempts: 10,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: true
		});
		void updatePlaybackSpeedButtons(speed);
	},
	persistState: true,
	state: {
		playbackSpeed: 1
	}
});
async function updateSpeedButtons(playerSpeed: number) {
	await updatePlaybackSpeedButtons(playerSpeed);
}
