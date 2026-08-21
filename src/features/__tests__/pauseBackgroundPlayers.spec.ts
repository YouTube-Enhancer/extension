import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";
import PlayerStates from "youtube-player/dist/constants/PlayerStates.js";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/pauseBackgroundPlayers/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getValueFromYouTubePlayer, waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { home } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

async function ensureVideoIsPlaying(page: Page, pageType: PageType): Promise<void> {
	const state = await getValueFromYouTubePlayer(page, "getPlayerState", pageType);
	if (state !== PlayerStates.PLAYING) {
		await page.evaluate(async () => {
			const player = document.querySelector<HTMLDivElement & { playVideo?: () => Promise<void> }>("#movie_player");
			await player?.playVideo?.();
			const video = document.querySelector<HTMLVideoElement>(".html5-main-video");
			if (video?.paused) {
				video.muted = true;
				await video.play().catch(() => {});
			}
		});
	}
	await expect
		.poll(async () => await getValueFromYouTubePlayer(page, "getPlayerState", pageType), { timeout: pageType === "live" ? 30000 : 15000 })
		.toBe(PlayerStates.PLAYING);
}

async function expectPlayerState(page: Page, state: number, pageType: PageType, timeout = 15000): Promise<void> {
	await expect.poll(async () => await getValueFromYouTubePlayer(page, "getPlayerState", pageType), { timeout }).toBe(state);
}

async function openAndPlayVideo(page: Page, pageType: PageType): Promise<void> {
	await navigateToPageType(page, pageType);
	await waitForYoutubePlayerReady(page, pageType);
	await ensureVideoIsPlaying(page, pageType);
}

test.describe("pauseBackgroundPlayers", () => {
	for (const pageType of testPages) {
		test(`pauses background players on ${pageType}`, async ({ context, page }) => {
			const pageA = page;
			const pageB = await context.newPage();
			await openAndPlayVideo(pageA, pageType);
			await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
			await expectPlayerState(pageA, PlayerStates.PLAYING, pageType);
			await openAndPlayVideo(pageB, pageType);
			await expectPlayerState(pageA, PlayerStates.PAUSED, pageType, pageType === "live" ? 30000 : 15000);
			await pageB.close();
		});
		test(`should not pause background players when disabled on ${pageType}`, async ({ context, page }) => {
			test.setTimeout(120_000);
			const pageA = page;
			const pageB = await context.newPage();
			await openAndPlayVideo(pageA, pageType);
			await disableFeature(pageA, "pauseBackgroundPlayers.enabled");
			await expectPlayerState(pageA, PlayerStates.PLAYING, pageType);
			await openAndPlayVideo(pageB, pageType);
			await expectPlayerState(pageA, PlayerStates.PLAYING, pageType);
			await pageB.close();
		});
		test(`should toggle background player pausing on ${pageType}`, async ({ context, page }) => {
			test.setTimeout(120_000);
			const pageA = page;
			const pageB = await context.newPage();
			await openAndPlayVideo(pageA, pageType);
			await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
			await expectPlayerState(pageA, PlayerStates.PLAYING, pageType);
			await openAndPlayVideo(pageB, pageType);
			await expectPlayerState(pageA, PlayerStates.PAUSED, pageType, pageType === "live" ? 30000 : 15000);
			await pageB.close();
			await disableFeature(pageA, "pauseBackgroundPlayers.enabled");
			await pageA.evaluate(() => document.querySelector<HTMLVideoElement>("video")?.play());
			await expectPlayerState(pageA, PlayerStates.PLAYING, pageType);
			const pageC = await context.newPage();
			await openAndPlayVideo(pageC, pageType);
			await expectPlayerState(pageA, PlayerStates.PLAYING, pageType);
			await pageC.close();
		});
		test(`should persist background player pausing after navigation on ${pageType}`, async ({ context, page }) => {
			const pageA = page;
			const pageB = await context.newPage();
			await openAndPlayVideo(pageA, pageType);
			await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
			await expectPlayerState(pageA, PlayerStates.PLAYING, pageType);
			await openAndPlayVideo(pageB, pageType);
			await expectPlayerState(pageA, PlayerStates.PAUSED, pageType, pageType === "live" ? 30000 : 15000);
			await pageB.close();
			await navigateToPageType(pageA, home);
			await navigateToPageType(pageA, pageType);
			await ensureVideoIsPlaying(pageA, pageType);
		});
		test(`should persist background player pausing after full page reload on ${pageType}`, async ({ context, page }) => {
			const pageA = page;
			await openAndPlayVideo(pageA, pageType);
			await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
			await expectPlayerState(pageA, PlayerStates.PLAYING, pageType);
			await pageA.reload();
			await navigateToPageType(pageA, pageType);
			await ensureVideoIsPlaying(pageA, pageType);
			const pageB = await context.newPage();
			await openAndPlayVideo(pageB, pageType);
			await expectPlayerState(pageA, PlayerStates.PAUSED, pageType, pageType === "live" ? 30000 : 15000);
			await pageB.close();
		});
	}

	test(`should not affect non-target page`, async ({ context, page }) => {
		const pageA = page;
		await navigateToPageType(pageA, nonTargetPage!);
		await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
		const pageB = await context.newPage();
		await navigateToPageType(pageB, testPages[0], []);
		await expect(pageA.locator("body")).toBeAttached();
		await pageB.close();
	});
});
