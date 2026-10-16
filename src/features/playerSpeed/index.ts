import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { updatePlaybackSpeedButtonTooltips } from "@/src/features/playbackSpeedButtons";
import { metadata as playbackSpeedButtonsMetadata } from "@/src/features/playbackSpeedButtons/index.metadata";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { waitForElement } from "@/src/utils/dom/wait";
import { getCurrentChannelId } from "@/src/utils/getChannelId";
import { browserColorLog } from "@/src/utils/logging";
import { isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import {
	clearManualOverride,
	clearSessionSpeed,
	getSessionSpeed,
	installUserInputTracking,
	isManualOverrideActive,
	isOwnWrite,
	markExtensionAppliedRate,
	markManualOverride,
	noteUserInput,
	setSessionSpeed,
	wasUserInputRecent
} from "./manualOverride";
import { parseChannelSpeeds } from "./utils";

const speedValueRegex = /(\d+(?:\.\d+)?)/;
const { defaults: playbackSpeedButtonsDefaults } = playbackSpeedButtonsMetadata;

export async function setPlayerSpeed(speed: number) {
	// Only the extension's own speed controls call this, on the user's behalf: the change is the user's choice
	// however the click reached the button, so enforcement stands down for it like for any manual change.
	noteUserInput();
	const playerContainer = isWatchPage()
		? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage()
			? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
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

function getPlaybackSpeedPerClick() {
	return featureConfigManager.getLastOr("playbackSpeedButtons", playbackSpeedButtonsDefaults).speed;
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
		const playerContainer = isWatchPage()
			? document.querySelector<YouTubePlayerDiv>("div#movie_player")
			: isShortsPage()
				? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
				: null;
		if (!playerContainer || !playerContainer.setPlaybackRate) return false;
		const playerVideoData = await playerContainer.getVideoData();
		if (playerVideoData.isLive) return true;
		/**
		 * After an SPA navigation the player briefly reports the previous video's data. Retry until it has switched
		 * to the video the URL points to, instead of writing a possibly stale speed onto the previous video.
		 */
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
function resolveEffectiveSpeed(
	speed: number,
	channelSpeeds: string | undefined,
	channelId: Nullable<string>
): number {
	if (!channelId) return speed;
	const entry = parseChannelSpeeds(channelSpeeds).get(channelId);
	if (entry === undefined) return speed;
	return Number.isFinite(entry) ? entry : speed;
}
let lastRecordedSpeed: Nullable<number> = null;
/** The speed configuration in force while the feature is enabled, for putting the rate back after YouTube resets it. */
let enforcedConfig: Nullable<{ channelSpeeds?: string; speed: number }> = null;
let observedSettingsMenu: Nullable<Element> = null;
/** YouTube resets the rate a few times per video at most; anything past this is a fight not worth having. */
const MAX_AUTOMATIC_REAPPLIES = 5;
let automaticReapplies: { count: number; videoId: Nullable<string> } = { count: 0, videoId: null };
// Teardown handles for the menu-scoped bus subscriptions and the display-span characterData observer.
let menuStyleUnsubscribe: Nullable<UnsubscribeFromDomMutations> = null;
let menuPanelUnsubscribe: Nullable<UnsubscribeFromDomMutations> = null;
let displaySpanObserver: Nullable<MutationObserver> = null;

function detachRateChangeListener() {
	const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!video) return;
	eventManager.removeEventListener(video, "ratechange", metadata.id);
}

function handleRateChange(video: HTMLVideoElement) {
	const { playbackRate: rate } = video;
	const urlVideoId = getUrlVideoId();
	/**
	 * Once a manual override is active, every change is recorded so that restore-on-disable tracks the user's latest
	 * choice, including rates that match an enforced value.
	 */
	if (!isManualOverrideActive(urlVideoId) && isOwnWrite(rate)) return;
	// YouTube writes the rate itself when a video or an ad starts, with nobody touching the page. That is no
	// choice of the user's, so the configured speed goes back on instead of enforcement standing down.
	if (!isManualOverrideActive(urlVideoId) && !wasUserInputRecent() && enforcedConfig) {
		reapplyEnforcedSpeed(urlVideoId);
		return;
	}
	markManualOverride(urlVideoId);
	setSessionSpeed(rate);
	void recordExternalSpeed(rate);
}

function reapplyEnforcedSpeed(urlVideoId: Nullable<string>) {
	if (!enforcedConfig) return;
	if (automaticReapplies.videoId !== urlVideoId)
		automaticReapplies = { count: 0, videoId: urlVideoId };
	if (automaticReapplies.count >= MAX_AUTOMATIC_REAPPLIES) return;
	automaticReapplies.count++;
	const { channelSpeeds, speed } = enforcedConfig;
	void registry.playerRetry(
		metadata.id,
		[makePlayerSpeedTask(speed, channelSpeeds)],
		["reapplySpeed"],
		{
			maxAttempts: 30,
			overallTimeout: 30000,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: true
		}
	);
}

function recordExternalSpeed(speed: number) {
	if (speed === lastRecordedSpeed) return;
	lastRecordedSpeed = speed;
	const stateAPI = registry.getStateAPI(metadata.id);
	stateAPI.setState((prev) => ({ ...prev, playbackSpeed: speed }));
	updatePlaybackSpeedButtons(speed);
}

function resetRecordedSpeed() {
	lastRecordedSpeed = null;
}

function setupPlaybackSpeedChangeListener() {
	// The settings menu can already exist when this runs (init on a page that opened settings, or a re-arm
	// after navigation): the bus only answers added nodes, so probe first and only subscribe when the menu
	// is genuinely absent.
	const arm = (menu: HTMLDivElement) => {
		if (observedSettingsMenu === menu) return;
		observedSettingsMenu = menu;
		setupMenuObserver(menu);
	};
	const existingMenu = document.querySelector<HTMLDivElement>(settingsPanelMenuSelector);
	if (existingMenu) {
		arm(existingMenu);
	} else {
		subscribeToDomMutations(
			settingsPanelMenuSelector,
			(elements) => {
				const menu = elements[0] as HTMLDivElement;
				if (menu) arm(menu);
			},
			// The settings menu is nested inside the player chrome YouTube renders, so
			// the descendant scan is required to find it.
			{ deep: true, once: true }
		);
	}
	function setupMenuObserver(settingsPanelMenu: HTMLDivElement) {
		teardownMenuObservers();
		let lastSpeed: Nullable<number> = null;
		const updateStoredSpeed = (speed: number) => {
			if (speed === lastSpeed) return;
			lastSpeed = speed;
			void updateSpeedButtons(speed);
			const stateAPI = registry.getStateAPI(metadata.id);
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
		const bindSpeedPanel = (elements: Element[]) => {
			const speedPanel =
				elements
					.find((element) => element.classList.contains("ytp-variable-speed-panel-content"))
					?.closest<HTMLDivElement>(".ytp-variable-speed-panel-content") ??
				settingsPanelMenu.querySelector<HTMLDivElement>(".ytp-variable-speed-panel-content");
			if (!speedPanel) return;
			// Slider
			const slider = speedPanel.querySelector<HTMLInputElement>(
				".ytp-input-slider.ytp-speedslider"
			);
			if (slider) {
				eventManager.removeEventListener(slider, "input", metadata.id);
				eventManager.addEventListener(
					slider,
					"input",
					() => handleSliderChange(slider),
					metadata.id
				);
			}
			// Preset buttons
			const presets = speedPanel.querySelectorAll<HTMLButtonElement>(
				".ytp-variable-speed-panel-preset-button"
			);
			presets.forEach((preset) => {
				eventManager.removeEventListener(preset, "click", metadata.id);
				eventManager.addEventListener(
					preset,
					"click",
					() => handlePresetClick(preset),
					metadata.id
				);
			});
			// Display span (catch programmatic updates). The bus cannot observe characterData,
			// so once the span exists a narrowly-scoped observer watches only its text.
			const displaySpan = speedPanel.querySelector<HTMLSpanElement>(
				".ytp-variable-speed-panel-display span, .ytp-speedslider-text"
			);
			if (displaySpan) {
				displaySpanObserver?.disconnect();
				displaySpanObserver = new MutationObserver(() => {
					const speed = parseSpeed(displaySpan.textContent);
					if (speed !== null) updateStoredSpeed(speed);
				});
				displaySpanObserver.observe(displaySpan, { characterData: true, childList: true });
			}
			const speed = parseSpeed(displaySpan?.textContent ?? null);
			if (speed !== null) updateStoredSpeed(speed);
		};
		// The speed panel is added and removed inside the menu as the user opens and closes the speed
		// submenu. The bus delivers the added panel content; the observer above then watches the display
		// span's characterData, which the bus does not support. The panel is nested inside the menu, so
		// the descendant scan is required to find it.
		menuPanelUnsubscribe = subscribeToDomMutations(
			".ytp-variable-speed-panel-content",
			bindSpeedPanel,
			{ deep: true, parent: settingsPanelMenu }
		);
		// Reset lastSpeed when menu closes. The bus answers attribute mutations on matching elements,
		// which replaces the previous per-call anonymous MutationObserver.
		menuStyleUnsubscribe = subscribeToDomMutations(
			settingsPanelMenuSelector,
			() => {
				if (settingsPanelMenu.style.display === "none") lastSpeed = null;
			},
			{ attributeFilter: ["style"] }
		);
	}
}

async function setupRateChangeListener() {
	const video = await waitForElement<HTMLVideoElement>("video.html5-main-video", 15000);
	if (!video) return;
	eventManager.removeEventListener(video, "ratechange", metadata.id);
	eventManager.addEventListener(video, "ratechange", () => handleRateChange(video), metadata.id);
}
function teardownMenuObservers() {
	menuStyleUnsubscribe?.();
	menuStyleUnsubscribe = null;
	menuPanelUnsubscribe?.();
	menuPanelUnsubscribe = null;
	displaySpanObserver?.disconnect();
	displaySpanObserver = null;
}
async function updateEffectivePlaybackSpeedButtons(speed: number, channelSpeeds?: string) {
	const channelId = await getCurrentChannelId();
	updatePlaybackSpeedButtons(resolveEffectiveSpeed(speed, channelSpeeds, channelId));
}
function updatePlaybackSpeedButtons(currentSpeed: number) {
	const playbackSpeedPerClick = getPlaybackSpeedPerClick();
	updatePlaybackSpeedButtonTooltips(currentSpeed, playbackSpeedPerClick);
}

export default createFeature({
	...metadata,
	migrateFromLocalStorage: () => {
		const speed = localStorage.getItem("playerSpeed");
		if (!speed) return undefined;
		return {
			playbackSpeed: Number(speed)
		};
	},
	onConfigChange: ({ channelSpeeds, enabled, speed }) => {
		if (!enabled) return;
		enforcedConfig = { channelSpeeds, speed };
		clearSessionSpeed();
		void registry.playerRetry(
			metadata.id,
			[makePlayerSpeedTask(speed, channelSpeeds)],
			["setSpeed"],
			{
				maxAttempts: 30,
				onPlayerStateChange: true,
				overallTimeout: 30000,
				pageTypes: ["watch", "shorts"],
				waitForLoaded: true
			}
		);
		void updateEffectivePlaybackSpeedButtons(speed, channelSpeeds);
	},
	onDisable: () => {
		enforcedConfig = null;
		teardownMenuObservers();
		observedSettingsMenu = null;
		// Lifecycle already aborted this feature's player retries before onDisable runs
		detachRateChangeListener();
		clearManualOverride();
		clearSessionSpeed();
		resetRecordedSpeed();
		const speed = registry.getStateAPI(metadata.id).getState()?.playbackSpeed ?? 1;
		browserColorLog(`Restoring player speed to ${speed}`, "FgMagenta");
		void registry.playerRetry(metadata.id, [makePlayerSpeedTask(speed)], ["restoreSpeed"], {
			maxAttempts: 30,
			overallTimeout: 30000,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: true
		});
		void updatePlaybackSpeedButtons(speed);
	},
	onEnable: ({ channelSpeeds, speed }) => {
		browserColorLog(`Setting player speed to ${speed}`, "FgMagenta");
		installUserInputTracking();
		enforcedConfig = { channelSpeeds, speed };
		// onInit only runs for features enabled at page load; a feature enabled later through the settings
		// still has to record manual speed changes from the player's settings menu, so arm it here too.
		setupPlaybackSpeedChangeListener();
		void setupRateChangeListener();
		clearManualOverride();
		clearSessionSpeed();
		resetRecordedSpeed();
		void registry.playerRetry(
			metadata.id,
			[makePlayerSpeedTask(speed, channelSpeeds)],
			["setSpeed"],
			{
				maxAttempts: 30,
				onPlayerStateChange: true,
				overallTimeout: 30000,
				pageTypes: ["watch", "shorts"],
				waitForLoaded: true
			}
		);
		void updateEffectivePlaybackSpeedButtons(speed, channelSpeeds);
	},
	onInit: setupPlaybackSpeedChangeListener,
	onNavigate: ({ channelSpeeds, speed }) => {
		const sessionSpeed = getSessionSpeed();
		const effectiveSpeed = sessionSpeed ?? speed;
		browserColorLog(
			`Setting player speed to ${effectiveSpeed} (navigation${sessionSpeed !== null ? ", session override" : ""})`,
			"FgMagenta"
		);
		enforcedConfig = { channelSpeeds, speed: effectiveSpeed };
		void setupRateChangeListener();
		// The once-subscription from init was consumed by the previous page's menu, which navigation took
		// out of the document; re-arm so manual speed changes keep being recorded after in-page navigation.
		setupPlaybackSpeedChangeListener();
		clearManualOverride();
		resetRecordedSpeed();
		void registry.playerRetry(
			metadata.id,
			[makePlayerSpeedTask(effectiveSpeed, channelSpeeds)],
			["setSpeed"],
			{
				maxAttempts: 30,
				onPlayerStateChange: true,
				overallTimeout: 30000,
				pageTypes: ["watch", "shorts"],
				waitForLoaded: true
			}
		);
		void updateEffectivePlaybackSpeedButtons(effectiveSpeed, channelSpeeds);
	},
	persistState: true,
	state: {
		playbackSpeed: 1
	}
});
function updateSpeedButtons(playerSpeed: number) {
	updatePlaybackSpeedButtons(playerSpeed);
}
