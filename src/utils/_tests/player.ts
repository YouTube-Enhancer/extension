import type { Page } from "@playwright/test";
import type { YouTubePlayer } from "youtube-player/dist/types";

import { expect } from "playwright.config";
import PlayerStates from "youtube-player/dist/constants/PlayerStates.js";

import type { PageType } from "@/src/features/_registry/types";
import type { PlayerQualityFallbackStrategy, YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";
import type { ModifierKey, Nullable } from "@/src/types";
import type { ControlType, YouTubePlayerGetKeysWithoutParams, YouTubePlayerGetReturnType, YouTubePlayerSetKeys } from "@/src/utils/_tests/types";

import { enableFeature, loadDefaultConfig, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { clamp } from "@/src/utils/math";
import { getPathValue } from "@/src/utils/misc";
import { chooseClosestQuality } from "@/src/utils/player/quality";

export async function adjustWithScrollWheel({
	controlType,
	direction,
	modifierKey = "altKey",
	page,
	pageType = "watch",
	value,
	withModifierKey = false,
	withRightClick = false
}: {
	controlType: ControlType;
	direction: "down" | "up";
	modifierKey?: ModifierKey;
	page: Page;
	pageType?: PageType;
	value: number;
	withModifierKey?: boolean;
	withRightClick?: boolean;
}) {
	const defaultConfiguration = await loadDefaultConfig();
	await enableFeature(page, `scrollWheel${controlType}Control.enabled`);
	const { [modifierKey]: keyToPress } = {
		altKey: "Alt",
		ctrlKey: "Control",
		shiftKey: "Shift"
	};
	if (withModifierKey) {
		if (controlType === "Volume") await enableFeature(page, `scrollWheel${controlType}Control.holdModifierKey`);
		await setOption(page, `scrollWheel${controlType}Control.modifierKey`, modifierKey);
	}
	if (controlType === "Volume" && withRightClick) {
		await enableFeature(page, `scrollWheel${controlType}Control.holdRightClick`);
	}
	const playerSelector = pageType === "shorts" ? "div#shorts-player" : "div#movie_player";
	await navigateToPageType(page, pageType);
	await page.evaluate(
		async ({ key, selector, value }) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			try {
				await (container[key] as (...args: number[]) => Promise<void>)(value);
			} catch (error) {
				console.error(error);
			}
		},
		{ key: `set${controlType === "Volume" ? "Volume" : "PlaybackRate"}`, selector: playerSelector, value } as const
	);
	const originalValue: unknown = await page.evaluate(
		async ([selector, key]) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			const result: unknown = await container[key]();
			return result;
		},
		[playerSelector, controlType === "Speed" ? "getPlaybackRate" : "getVolume"] as const
	);
	expect(originalValue).toBeTruthy();
	expect(originalValue).toBe(value);
	const playerContainer = page.locator(playerSelector);
	await playerContainer.hover();
	const playerContainerBoundingBox = await playerContainer.boundingBox();
	expect(playerContainerBoundingBox).toBeTruthy();
	const {
		height: playerContainerHeight,
		width: playerContainerWidth,
		x: playerContainerX,
		y: playerContainerY
	} = playerContainerBoundingBox as { height: number; width: number; x: number; y: number };

	if (withModifierKey) {
		await page.keyboard.down(keyToPress);
	}
	if (withRightClick) {
		await page.mouse.move(playerContainerX + playerContainerWidth / 2, playerContainerY + playerContainerHeight / 2);
		await page.mouse.down({
			button: "right"
		});
	}
	await page.mouse.wheel(0, direction === "up" ? -1 : 1);
	if (withModifierKey) {
		await page.keyboard.up(keyToPress);
	}
	if (withRightClick) {
		await page.mouse.move(playerContainerX + playerContainerWidth / 2, playerContainerY + playerContainerHeight / 2);
		await page.mouse.up({
			button: "right"
		});
	}
	const valueAfterScroll: unknown = await page.evaluate(
		async ([selector, key]) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			const result: unknown = await container[key]();
			return result;
		},
		[playerSelector, controlType === "Speed" ? "getPlaybackRate" : "getVolume"] as const
	);
	const expectedValue = value + (direction === "up" ? 1 : -1) * Number(getPathValue(defaultConfiguration, `scrollWheel${controlType}Control.steps`));
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
	key: K,
	...value: V
) {
	await page.evaluate(
		async ({ key, selector, value }) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			try {
				await (container[key] as (...args: V[]) => Promise<void>)(...value);
			} catch (error) {
				console.error(error);
			}
		},
		{ key, selector: "div#movie_player", value } as const
	);
}
export async function setVolume(page: Page, volume: number, pageType: PageType = "watch") {
	const playerSelector = pageType === "shorts" ? "div#shorts-player" : "div#movie_player";
	await page.evaluate(
		async ([selector, volume]) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			await container.setVolume(volume);
		},
		[playerSelector, volume] as const
	);
}
export async function waitForYoutubePlayerReady(page: Page): Promise<void> {
	await page.waitForFunction(async () => {
		const player = document.querySelector("#movie_player") as unknown as Nullable<YouTubePlayer>;
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
	});
}
