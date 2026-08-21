import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { waitForElement } from "@/src/utils/dom/wait";
import { getCurrentChannelId } from "@/src/utils/getChannelId";
import { browserColorLog } from "@/src/utils/logging";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { clearManualOverride, isManualOverrideActive, isOwnWrite, markExtensionAppliedRate, markManualOverride } from "./manualOverride";
import { parseChannelSpeeds } from "./utils";

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
/**
 * Returns the video id of the video that the current URL points to, or null when not on watch/shorts.
 */
function getUrlVideoId(): Nullable<string> {
	if (isWatchPage()) return new URLSearchParams(window.location.search).get("v");
	if (isShortsPage()) return window.location.pathname.match(/\/shorts\/([\w-]+)/)?.[1] ?? null;
	return null;
}
function makePlayerSpeedTask(speed: number, channelSpeeds?: string): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		const playerContainer =
			isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
			: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
			: null;
		if (!playerContainer || !playerContainer.setPlaybackRate) return false;
		const playerVideoData = await playerContainer.getVideoData();
		if (playerVideoData.isLive) return true;
		// After SPA navigation the player briefly reports the previous video's data.
		// Retry until the player has switched to the video the URL points to instead of
		// writing a possibly-stale speed onto the previous video.
		const urlVideoId = getUrlVideoId();
		if (!urlVideoId || playerVideoData.video_id !== urlVideoId) return false;
		// A manual adjustment on this video wins over enforcement until navigation.
		if (isManualOverrideActive(urlVideoId)) return true;
		const channelId = await getCurrentChannelId();
		const effectiveSpeed = resolveEffectiveSpeed(speed, channelSpeeds, channelId);
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		if (!video) return false;
		markExtensionAppliedRate(effectiveSpeed);
		await playerContainer.setPlaybackRate(effectiveSpeed);
		video.playbackRate = effectiveSpeed;
		return true;
	};
}
function resolveEffectiveSpeed(speed: number, channelSpeeds: string | undefined, channelId: Nullable<string>): number {
	if (!channelId) return speed;
	const entry = parseChannelSpeeds(channelSpeeds).get(channelId);
	if (entry === undefined) return speed;
	return Number.isFinite(entry) ? entry : speed;
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
let lastRecordedSpeed: Nullable<number> = null;

function detachRateChangeListener() {
	const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!video) return;
	eventManager.removeEventListener(video, "ratechange", metadata.id);
}

function handleRateChange(video: HTMLVideoElement) {
	const { playbackRate: rate } = video;
	const urlVideoId = getUrlVideoId();
	// Once a manual override is active, every change is recorded so restore-on-disable
	// tracks the user's latest choice — including rates that match an enforced value.
	if (!isManualOverrideActive(urlVideoId) && isOwnWrite(rate)) return;
	markManualOverride(urlVideoId);
	void recordExternalSpeed(rate);
}

async function recordExternalSpeed(speed: number) {
	if (speed === lastRecordedSpeed) return;
	lastRecordedSpeed = speed;
	const stateAPI = registry.stateManager.getStateAPI(metadata.id);
	stateAPI.setState((prev) => ({ ...prev, playbackSpeed: speed }));
	await updatePlaybackSpeedButtons(speed);
}

function resetRecordedSpeed() {
	lastRecordedSpeed = null;
}

async function setupRateChangeListener() {
	const video = await waitForElement<HTMLVideoElement>("video.html5-main-video", 15000);
	if (!video) return;
	eventManager.removeEventListener(video, "ratechange", metadata.id);
	eventManager.addEventListener(video, "ratechange", () => handleRateChange(video), metadata.id);
}
async function updateEffectivePlaybackSpeedButtons(speed: number, channelSpeeds?: string) {
	const channelId = await getCurrentChannelId();
	await updatePlaybackSpeedButtons(resolveEffectiveSpeed(speed, channelSpeeds, channelId));
}
async function updatePlaybackSpeedButtons(currentSpeed: number) {
	const playbackSpeedPerClick = await getPlaybackSpeedPerClick();
	await updatePlaybackSpeedButtonTooltips(currentSpeed, playbackSpeedPerClick);
}

export default createFeature({
	...metadata,
	onConfigChange: ({ channelSpeeds, enabled, speed }) => {
		if (!enabled) return;
		void registry.playerManager.executeWithRetries(metadata.id, [makePlayerSpeedTask(speed, channelSpeeds)], ["setSpeed"], {
			maxAttempts: 10,
			onPlayerStateChange: true,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: true
		});
		void updateEffectivePlaybackSpeedButtons(speed, channelSpeeds);
	},
	onDisable: () => {
		registry.playerManager.cleanup(metadata.id);
		detachRateChangeListener();
		clearManualOverride();
		resetRecordedSpeed();
		const speed = registry.stateManager.getStateAPI(metadata.id).getState()?.playbackSpeed ?? 1;
		browserColorLog(`Restoring player speed to ${speed}`, "FgMagenta");
		void registry.playerManager.executeWithRetries(metadata.id, [makePlayerSpeedTask(speed)], ["restoreSpeed"], {
			maxAttempts: 10,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: true
		});
		void updatePlaybackSpeedButtons(speed);
	},
	onEnable: ({ channelSpeeds, speed }) => {
		browserColorLog(`Setting player speed to ${speed}`, "FgMagenta");
		void setupRateChangeListener();
		clearManualOverride();
		resetRecordedSpeed();
		void registry.playerManager.executeWithRetries(metadata.id, [makePlayerSpeedTask(speed, channelSpeeds)], ["setSpeed"], {
			maxAttempts: 10,
			onPlayerStateChange: true,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: true
		});
		void updateEffectivePlaybackSpeedButtons(speed, channelSpeeds);
	},
	onInit: setupPlaybackSpeedChangeListener,
	onNavigate: ({ channelSpeeds, speed }) => {
		browserColorLog(`Setting player speed to ${speed} (navigation)`, "FgMagenta");
		void setupRateChangeListener();
		clearManualOverride();
		resetRecordedSpeed();
		void registry.playerManager.executeWithRetries(metadata.id, [makePlayerSpeedTask(speed, channelSpeeds)], ["setSpeed"], {
			maxAttempts: 10,
			onPlayerStateChange: true,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: true
		});
		void updateEffectivePlaybackSpeedButtons(speed, channelSpeeds);
	},
	persistState: true,
	state: {
		playbackSpeed: 1
	}
});
async function updateSpeedButtons(playerSpeed: number) {
	await updatePlaybackSpeedButtons(playerSpeed);
}
