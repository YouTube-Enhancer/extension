import type { Page } from "@playwright/test";
import type { YouTubePlayer } from "youtube-player/dist/types";

import { expect } from "playwright.config";
import PlayerStates from "youtube-player/dist/constants/PlayerStates.js";

import type { PageType } from "@/src/features/_registry/types";
import type { PlayerQualityFallbackStrategy, YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";
import type { ModifierKey, Nullable } from "@/src/types";
import type { ControlType, YouTubePlayerGetKeysWithoutParams, YouTubePlayerGetReturnType, YouTubePlayerSetKeys } from "@/src/utils/_tests/types";

import { enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { clamp } from "@/src/utils/math";
import { chooseClosestQuality } from "@/src/utils/player/quality";

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
	await setValueOnYouTubePlayer(page, pageType, `set${controlType === "Volume" ? "Volume" : "PlaybackRate"}`, initialValue);
	const originalValue = await getValueFromYouTubePlayer(page, `get${controlType === "Volume" ? "Volume" : "PlaybackRate"}`, pageType);
	expect(originalValue).toBeTruthy();
	if (!originalValue) return;
	expect(originalValue).toBe(initialValue);
	// Dispatch the wheel event directly on the container element the feature listens on.
	// Using page.mouse.wheel() on div#movie_player can be swallowed by YouTube's own
	// wheel handlers before it bubbles up to div#player where the extension listens.
	const wheelContainerSelector = pageType === "shorts" ? "#player-container:has(#shorts-player)" : "div#player";
	const wheelInit: Record<string, unknown> = {
		bubbles: true,
		cancelable: true,
		deltaMode: 0,
		deltaY: direction === "up" ? -1 : 1
	};
	if (withModifierKey) {
		wheelInit[modifierKey] = true;
	}
	if (withRightClick) {
		wheelInit.buttons = 2;
	}
	await page.evaluate(
		([selector, init]) => {
			const el = document.querySelector(selector);
			if (el) el.dispatchEvent(new WheelEvent("wheel", init as WheelEventInit));
		},
		[wheelContainerSelector, wheelInit] as const
	);
	let valueAfterScroll: unknown = null;
	const endTime = Date.now() + 5000;
	while (Date.now() < endTime) {
		await page.waitForTimeout(100);
		valueAfterScroll = await getValueFromYouTubePlayer(page, controlType === "Speed" ? "getPlaybackRate" : "getVolume", pageType);
		if (valueAfterScroll !== null && valueAfterScroll !== originalValue) break;
	}
	const expectedValue = originalValue + steps * (direction === "up" ? 1 : -1);
	expect(valueAfterScroll).toBeTruthy();
	expect(valueAfterScroll).toBe(controlType === "Speed" ? clamp(expectedValue, 0.25, 4) : expectedValue);
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
export async function getCurrentVolume(page: Page, pageType: PageType = "watch") {
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
export async function setValueOnYouTubePlayer<P extends Page, K extends YouTubePlayerSetKeys, V extends Parameters<YouTubePlayer[K]>>(
	page: P,
	pageType: PageType = "watch",
	key: K,
	...value: V
) {
	await page.evaluate(
		async ({ key, selector, value }) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			try {
				if (key === "setPlaybackRate" && typeof value === "number") {
					const video = document.querySelector<HTMLVideoElement>(`${selector} video`);
					if (video) video.playbackRate = value;
				} else if (key === "setVolume" && typeof value === "number") {
					const video = document.querySelector<HTMLVideoElement>(`${selector} video`);
					if (video) video.volume = value;
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
export async function waitForYoutubePlayerReady(page: Page, pageType: PageType): Promise<void> {
	await page.waitForFunction(async (pageType) => {
		const player = document.querySelector(pageType === "shorts" ? "div#shorts-player" : "#movie_player") as unknown as Nullable<YouTubePlayer>;
		if (!player) return false;
		if (typeof player.getPlayerState !== "function") return false;
		if (typeof player.getCurrentTime !== "function") return false;
		try {
			const state = await player.getPlayerState();
			// -1 = unstarted
			// 0 = ended
			// 1 = playing
			// 2 = paused
			// 3 = buffering
			// 5 = video cued
			return state !== undefined && state !== null && state !== PlayerStates["UNSTARTED"];
		} catch {
			return false;
		}
	}, pageType);
}
