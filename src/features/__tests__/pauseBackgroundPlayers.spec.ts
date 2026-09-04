import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/pauseBackgroundPlayers/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, PlayerStates } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getValueFromYouTubePlayer, waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { home, shorts, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

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
	}
	// Runs on watch only: the feature has no live/VOD branch and the live fixture costs up to 120 s per iteration.
	test("should not pause the tab that started playing on watch", async ({ context, page }) => {
		test.setTimeout(120_000);
		const pageA = page;
		const pageB = await context.newPage();
		await openAndPlayVideo(pageA, watch);
		await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
		await expectPlayerState(pageA, PlayerStates.PLAYING, watch);
		await openAndPlayVideo(pageB, watch);
		await expectPlayerState(pageA, PlayerStates.PAUSED, watch);
		// The background handler skips the sender tab, so the tab whose playback triggered the broadcast has
		// to keep playing - without that skip the feature would pause the video the user just started.
		await expectToStay(async () => getValueFromYouTubePlayer(pageB, "getPlayerState", watch), PlayerStates.PLAYING, { page: pageB });
		await pageB.close();
	});
	test("should stop pausing other tabs after being disabled on watch", async ({ context, page }) => {
		test.setTimeout(120_000);
		const pageA = page;
		const pageB = await context.newPage();
		await openAndPlayVideo(pageA, watch);
		await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
		await openAndPlayVideo(pageB, watch);
		// Proves the listener was attached, so the silence after the disable below is attributable to onDisable.
		await expectPlayerState(pageA, PlayerStates.PAUSED, watch);
		await disableFeature(pageA, "pauseBackgroundPlayers.enabled");
		// Whether a tab gets paused is decided by the sender's listener, so the disabled tab has to become the
		// sender: resuming it must no longer reach the background handler.
		await pageA.bringToFront();
		await ensureVideoIsPlaying(pageA, watch);
		await expectToStay(async () => getValueFromYouTubePlayer(pageB, "getPlayerState", watch), PlayerStates.PLAYING, { page: pageB });
		await pageB.close();
	});
	test("should not pause other tabs when playback starts in a hidden tab on watch", async ({ context, page }) => {
		test.setTimeout(120_000);
		const pageA = page;
		const pageB = await context.newPage();
		await openAndPlayVideo(pageB, watch);
		await enableFeature(pageB, "pauseBackgroundPlayers.enabled");
		await openAndPlayVideo(pageA, watch);
		await expectPlayerState(pageB, PlayerStates.PAUSED, watch);
		// Activating pageA is what puts pageB in the background; nothing before this point makes either tab the
		// foreground one, so document.hidden would stay false on both.
		await pageA.bringToFront();
		// The early return only applies while the tab is hidden, so establish that first - otherwise the rest of
		// the test would pass for the wrong reason. Playwright keeps every page it drives visible: a background tab
		// reports document.hidden === false headed or headless, with focus emulation off, even in a minimized window
		// (checked 2026-09-04 on Playwright 1.62; its maintainers call this intentional). The feature reads
		// document.hidden at play time, so the property is stubbed on the background tab and the run says so. The
		// short probe stays so a Playwright that does hide tabs would be used as is.
		const isHidden = await pageB
			.waitForFunction(() => document.hidden, undefined, { timeout: 1500 })
			.then(() => true)
			.catch(() => false);
		if (!isHidden) {
			await pageB.evaluate(() => {
				Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
				Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
			});
			test.info().annotations.push({ description: "document.hidden stubbed: Playwright keeps every page visible", type: "note" });
		}
		await expect.poll(async () => pageB.evaluate(() => document.hidden)).toBe(true);
		await pageB.evaluate(async () => {
			const video = document.querySelector<HTMLVideoElement>(".html5-main-video");
			if (!video) return;
			video.muted = true;
			await video.play().catch(() => {});
		});
		await expectPlayerState(pageB, PlayerStates.PLAYING, watch);
		// A background tab resuming playback must never steal playback from the tab the user is watching.
		await expectToStay(async () => getValueFromYouTubePlayer(pageA, "getPlayerState", watch), PlayerStates.PLAYING, { page: pageA });
		await pageB.close();
	});
	test("should persist background player pausing after navigation on watch", async ({ context, page }) => {
		test.setTimeout(120_000);
		const pageA = page;
		const pageB = await context.newPage();
		await openAndPlayVideo(pageA, watch);
		await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
		await expectPlayerState(pageA, PlayerStates.PLAYING, watch);
		await openAndPlayVideo(pageB, watch);
		await expectPlayerState(pageA, PlayerStates.PAUSED, watch);
		// The navigated tab has to become the sender, otherwise nothing observes the listeners onNavigate re-attaches.
		await navigateToPageType(pageA, home);
		await navigateToPageType(pageA, watch);
		// The navigated tab autoplays and may already have paused the other one. Starting that one again makes the
		// pause below attributable to the listeners the navigated tab re-attached, not to its autoplay.
		await ensureVideoIsPlaying(pageB, watch);
		await expectPlayerState(pageB, PlayerStates.PLAYING, watch);
		await ensureVideoIsPlaying(pageA, watch);
		await expectPlayerState(pageB, PlayerStates.PAUSED, watch);
		await expectPlayerState(pageA, PlayerStates.PLAYING, watch);
		await pageB.close();
	});
	// The feature has no live/VOD branch (a live page is a /watch document), so the disabled case runs on watch
	// only; live-page gating is still proven by `pauses background players on live` and the live fixture costs
	// up to 120 s per iteration.
	test("should not pause background players when disabled on watch", async ({ context, page }) => {
		test.setTimeout(120_000);
		const pageA = page;
		const pageB = await context.newPage();
		await openAndPlayVideo(pageA, watch);
		await disableFeature(pageA, "pauseBackgroundPlayers.enabled");
		await expectPlayerState(pageA, PlayerStates.PLAYING, watch);
		await openAndPlayVideo(pageB, watch);
		await expectPlayerState(pageA, PlayerStates.PLAYING, watch);
		await pageB.close();
	});

	test("should not affect non-target page", async ({ context, page }) => {
		test.setTimeout(120_000);
		const pageA = page;
		const pageB = await context.newPage();
		await openAndPlayVideo(pageA, watch);
		await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
		await expectPlayerState(pageA, PlayerStates.PLAYING, watch);
		// shorts sits outside includePages, so a player starting there must never pause the watch tab.
		await openAndPlayVideo(pageB, shorts);
		await expectToStay(async () => getValueFromYouTubePlayer(pageA, "getPlayerState", watch), PlayerStates.PLAYING, { page: pageA });
		await pageB.close();
	});
});
