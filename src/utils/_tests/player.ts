import type { Page } from "@playwright/test";
import type { YouTubePlayer } from "youtube-player/dist/types";

import { expect } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";
import type { PlayerQualityFallbackStrategy, YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";
import type { ModifierKey, Nullable, YouTubePlayerDiv } from "@/src/types";
import type { ControlType, YouTubePlayerGetKeysWithoutParams, YouTubePlayerGetReturnType, YouTubePlayerSetKeys } from "@/src/utils/_tests/types";

import { PlayerStates } from "@/src/utils/_tests/constants";
import { enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { clamp } from "@/src/utils/math";
import { chooseClosestQuality } from "@/src/utils/player/quality";

/**
 * Pixel delta of a single mouse wheel notch. The scroll wheel controller's stepper normalises
 * wheel deltas so that this many pixels equals exactly one step.
 */
export const WHEEL_DELTA_PER_NOTCH = 100;

export async function adjustWithScrollWheel({
	controlType,
	direction,
	initialValue,
	modifierKey = "altKey",
	page,
	pageType = "watch",
	steps,
	withModifierKey = false,
	withRightClick = false
}: {
	controlType: ControlType;
	direction: "down" | "up";
	initialValue: number;
	modifierKey?: ModifierKey;
	page: Page;
	pageType?: PageType;
	steps: number;
	withModifierKey?: boolean;
	withRightClick?: boolean;
}) {
	await navigateToPageType(page, pageType);
	await setOption(page, `scrollWheel${controlType}Control.steps`, steps);
	if (withModifierKey) {
		if (controlType === "Volume") await enableFeature(page, `scrollWheel${controlType}Control.holdModifierKey`);
		await setOption(page, `scrollWheel${controlType}Control.modifierKey`, modifierKey);
	}
	if (controlType === "Volume" && withRightClick) {
		await enableFeature(page, `scrollWheel${controlType}Control.holdRightClick`);
	}
	await enableFeature(page, `scrollWheel${controlType}Control.enabled`);
	await waitForScrollWheelControl(page, controlType === "Volume" ? "volume" : "speed", true);
	await setValueOnYouTubePlayer(page, pageType, `set${controlType === "Volume" ? "Volume" : "PlaybackRate"}`, initialValue);
	const getter = controlType === "Volume" ? getCurrentVolume : getCurrentSpeed;
	const originalValue = await getter(page, pageType);
	expect(originalValue).toBeTruthy();
	if (!originalValue) return;
	expect(originalValue).toBe(initialValue);
	const wheelInit: Record<string, unknown> = {};
	if (withModifierKey) {
		wheelInit[modifierKey] = true;
	}
	if (withRightClick) {
		wheelInit.buttons = 2;
	}
	await dispatchWheelNotches(page, pageType, direction, 1, wheelInit);
	let valueAfterScroll: unknown = null;
	const pollTimeout = pageType === "live" ? 10000 : 5000;
	const endTime = Date.now() + pollTimeout;
	while (Date.now() < endTime) {
		await page.waitForTimeout(100);
		valueAfterScroll = await getter(page, pageType);
		if (valueAfterScroll !== null && valueAfterScroll !== originalValue) break;
	}
	const expectedValue = originalValue + steps * (direction === "up" ? 1 : -1);
	expect(valueAfterScroll).toBeTruthy();
	expect(valueAfterScroll).toBe(controlType === "Speed" ? clamp(expectedValue, 0.25, 4) : expectedValue);
}
/**
 * Dispatches synthetic wheel notches on the container element the scroll wheel controller listens on.
 *
 * The events are dispatched directly instead of via `page.mouse.wheel()` because YouTube's own wheel
 * handlers on the player can swallow real wheel input before it bubbles up to `div#player`.
 */
export async function dispatchWheelNotches(
	page: Page,
	pageType: PageType,
	direction: "down" | "up",
	notches = 1,
	init: Record<string, unknown> = {}
): Promise<void> {
	const wheelInit: Record<string, unknown> = {
		bubbles: true,
		cancelable: true,
		deltaMode: 0,
		deltaY: direction === "up" ? -WHEEL_DELTA_PER_NOTCH : WHEEL_DELTA_PER_NOTCH,
		...init
	};
	await page.evaluate(
		([selector, eventInit, count]) => {
			const el = document.querySelector(selector);
			if (!el) throw new Error(`Wheel target ${selector} not found`);
			for (let i = 0; i < count; i++) el.dispatchEvent(new WheelEvent("wheel", eventInit));
		},
		[getWheelContainerSelector(pageType), wheelInit, notches] as const
	);
}
export async function ensureCaptionsState(page: Page, desired: boolean): Promise<boolean> {
	const btn = page.locator("button.ytp-subtitles-button");
	if ((await btn.count()) === 0) return false;
	if (await isCaptionsUnavailable(page)) return false;
	const current = await getCaptionsState(page);
	if (current === null) return false;
	if (current === desired) return true;
	await page
		.locator("#movie_player")
		.hover({ timeout: 5000 })
		.catch(() => {});
	await page.waitForTimeout(200);
	await btn.evaluate((el) => (el as HTMLButtonElement).click());
	await page.waitForTimeout(150);
	try {
		await expect.poll(async () => getCaptionsState(page)).toBe(desired);
	} catch {
		return false;
	}
	// The button reports the new state before the captions module has finished switching; a click that
	// follows too closely - the feature's own, for one - can be swallowed, so let the toggle settle first.
	await page.waitForTimeout(750);
	return (await getCaptionsState(page)) === desired;
}

export async function expectStableCaptionsState(page: Page, expected: boolean, { timeout = 5000 }: { timeout?: number } = {}) {
	let stableCount = 0;
	await expect
		.poll(
			async () => {
				const state = await getCaptionsState(page);
				if (state === expected) stableCount++;
				else stableCount = 0;
				return stableCount;
			},
			{ timeout }
		)
		.toBe(2);
}
export async function freezeAndGetTime(page: Page, pageType: PageType) {
	await page.evaluate(() => {
		const video = document.querySelector<HTMLVideoElement>("video");
		if (!video) return;
		video.pause();
	});
	return await getValueFromYouTubePlayer(page, "getCurrentTime", pageType);
}
export async function getCaptionsState(page: Page): Promise<boolean | null> {
	const btn = page.locator("button.ytp-subtitles-button");
	if ((await btn.count()) === 0) return null;
	const pressed = await btn.getAttribute("aria-pressed");
	if (!pressed) return null;
	return pressed === "true";
}
export async function getClosestQuality(
	page: Page,
	pageType: PageType = "watch",
	quality: YoutubePlayerQualityLevel,
	fallbackStrategy: PlayerQualityFallbackStrategy = "higher"
) {
	const availableQualityLevels = await getValueFromYouTubePlayer(page, "getAvailableQualityLevels", pageType);
	expect(availableQualityLevels).toBeTruthy();
	if (!availableQualityLevels) return;
	const closestQuality = chooseClosestQuality(quality, availableQualityLevels, fallbackStrategy);
	return closestQuality;
}
export async function getCurrentSpeed(page: Page, pageType: PageType = "watch") {
	if (pageType === "shorts") {
		const videoSpeed = await page.evaluate(() => {
			// After moving to another short the outgoing reel's video element is still in the document, ahead of
			// the active one, so the read is scoped to the active player.
			const video =
				document.querySelector<HTMLVideoElement>("div#shorts-player video.html5-main-video") ??
				document.querySelector<HTMLVideoElement>("video.html5-main-video");
			return video?.playbackRate ?? null;
		});
		if (videoSpeed !== null) return videoSpeed;
	}
	const currentSpeed = await getValueFromYouTubePlayer(page, "getPlaybackRate", pageType);
	return currentSpeed;
}
export async function getCurrentVolume(page: Page, pageType: PageType = "watch") {
	if (pageType === "shorts") {
		const videoVolume = await page.evaluate(() => {
			// The outgoing reel's element fades its volume out while it is still in the document; see getCurrentSpeed.
			const video =
				document.querySelector<HTMLVideoElement>("div#shorts-player video.html5-main-video") ??
				document.querySelector<HTMLVideoElement>("video.html5-main-video");
			if (!video) return null;
			return Math.round(video.volume * 100);
		});
		if (videoVolume !== null) return videoVolume;
	}
	const currentVolume = await getValueFromYouTubePlayer(page, "getVolume", pageType);
	return currentVolume;
}
export async function getValueFromYouTubePlayer<P extends Page, K extends YouTubePlayerGetKeysWithoutParams>(
	page: P,
	key: K,
	pageType: PageType = "watch"
) {
	const playerSelector = pageType === "shorts" ? "div#shorts-player" : "div#movie_player";
	const value: unknown = await page.evaluate(
		async ([selector, key]) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			const result: unknown = await container[key]();
			return result;
		},
		[playerSelector, key] as const
	);
	return value as Nullable<YouTubePlayerGetReturnType<K>>;
}
export function getWheelContainerSelector(pageType: PageType): string {
	return pageType === "shorts" ? "#player-container:has(#shorts-player)" : "div#player";
}

export async function isCaptionsUnavailable(page: Page): Promise<boolean> {
	const btn = page.locator("button.ytp-subtitles-button");
	if ((await btn.count()) === 0) return true;
	// YouTube hides the button while the video offers no caption track. The button's label is no signal: on the
	// watch fixture it reads "unavailable" while the player lists five tracks. The player response's caption tracks
	// decide: a video lists them there or has none. A live stream is the exception - it keeps its auto-generated
	// track outside the response and lists it only once captions are on - so a live stream counts as available and
	// a toggle is what proves it (see the live fixture hunt).
	return btn.evaluate((el) => {
		if ((el as HTMLElement).style.display === "none") return true;
		const player = document.querySelector<
			HTMLDivElement & {
				getPlayerResponse?: () =>
					| undefined
					| { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: unknown[] } }; videoDetails?: { isLive?: boolean } };
			}
		>("div#movie_player");
		try {
			const response = player?.getPlayerResponse?.();
			const captionTracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
			if (Array.isArray(captionTracks)) return captionTracks.length === 0;
			return response?.videoDetails?.isLive !== true;
		} catch {
			return false;
		}
	});
}
export async function setValueOnYouTubePlayer<P extends Page, K extends YouTubePlayerSetKeys, V extends Parameters<YouTubePlayer[K]>>(
	page: P,
	pageType: PageType = "watch",
	key: K,
	...value: V
) {
	await page.evaluate(
		async ({ key, selector, value }) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayerDiv>;
			if (!container) return null;
			try {
				const video = container.querySelector<HTMLVideoElement>("video");
				if (key === "setPlaybackRate" && typeof value === "number") {
					if (video) video.playbackRate = value;
				}
				await (container[key] as (...args: V[]) => Promise<void>)(...value);
			} catch (error) {
				console.error(error);
			}
		},
		{ key, selector: pageType === "shorts" ? "div#shorts-player" : "div#movie_player", value } as const
	);
}
export async function setVolume(page: Page, volume: number, pageType: PageType = "watch") {
	await setValueOnYouTubePlayer(page, pageType, "setVolume", volume);
}
/**
 * Waits for the video to offer captions. YouTube hides the subtitles button, or labels it unavailable, until the
 * caption track has loaded - and again for a moment after a skipped pre-roll ad - so one sample right after
 * navigation says nothing. Resolves false when the video still offers none after the timeout.
 */
export async function waitForCaptionsAvailable(page: Page, timeout = 10000): Promise<boolean> {
	return await expect
		.poll(async () => isCaptionsUnavailable(page), { intervals: [500], timeout })
		.toBe(false)
		.then(() => true)
		.catch(() => false);
}
/**
 * Waits for a scroll wheel control to finish attaching (or detaching) its listeners.
 * The controller marks the body with `yte-scroll-wheel-<type>-control` while that control is active.
 */
export async function waitForScrollWheelControl(page: Page, type: "speed" | "volume", active: boolean): Promise<void> {
	await expect
		.poll(async () => page.evaluate((className) => document.body.classList.contains(className), `yte-scroll-wheel-${type}-control`), {
			timeout: 10_000
		})
		.toBe(active);
}
export async function waitForScrollWheelVolumeControl(page: Page, active: boolean): Promise<void> {
	await waitForScrollWheelControl(page, "volume", active);
}
export async function waitForStableTime(page: Page, pageType: PageType, threshold = 150) {
	let last = await getValueFromYouTubePlayer(page, "getCurrentTime", pageType);
	let stableFor = 0;
	while (stableFor < threshold) {
		await page.waitForTimeout(50);
		const now = await getValueFromYouTubePlayer(page, "getCurrentTime", pageType);
		expect(now).not.toBeNull();
		expect(last).not.toBeNull();
		if (Math.abs(now! - last!) < 0.05) {
			stableFor += 50;
		} else {
			stableFor = 0;
		}
		last = now;
	}
	return last;
}

export async function waitForYoutubePlayerReady(page: Page, pageType: PageType): Promise<void> {
	await page.waitForFunction(
		async (pageType) => {
			const player = document.querySelector(pageType === "shorts" ? "div#shorts-player" : "#movie_player") as unknown as Nullable<YouTubePlayerDiv>;
			if (!player) return false;
			if (typeof player.getPlayerState !== "function") return false;
			if (typeof player.getCurrentTime !== "function") return false;
			if (typeof player.setVolume !== "function") return false;
			try {
				const state: Nullable<number> = await player.getPlayerState();
				// -1 = unstarted
				// 0 = ended
				// 1 = playing
				// 2 = paused
				// 3 = buffering
				// 5 = video cued
				if (state === undefined || state === null || state === PlayerStates.UNSTARTED) return false;
				const video = player.querySelector<HTMLVideoElement>("video");
				if (!video) return false;
				const { currentTime, networkState, readyState, seeking, volume } = video;
				if (readyState < 2) return false;
				if (seeking) return false;
				if (networkState === 2) return false;
				const v1 = volume;
				const t1 = currentTime;
				await new Promise((resolve) => setTimeout(resolve, 200));
				const { currentTime: t2, volume: v2 } = video;
				return v1 === v2 && t1 === t2;
			} catch {
				return false;
			}
		},
		pageType,
		{ timeout: 30_000 }
	);
}
