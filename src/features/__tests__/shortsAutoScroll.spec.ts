import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/shortsAutoScroll/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { shorts } = pageTypeRecord;

async function expectAutoScroll(page: Page, initialId: Nullable<string>): Promise<void> {
	await expect
		.poll(() => getShortId(page.url()), {
			timeout: 25_000
		})
		.not.toBe(initialId);
}

async function expectNoAutoScroll(page: Page, initialId: Nullable<string>): Promise<void> {
	// expect.poll stops at its first passing sample, and the URL is necessarily still the initial one the
	// moment the end of the short is simulated - so the absence of a scroll has to be held over a window.
	await expectToStay(() => Promise.resolve(getShortId(page.url())), initialId, { durationMs: 3000, page });
}

function getShortId(url: string): Nullable<string> {
	const match = url.match(/shorts\/([^/?]+)/);
	return match?.[1] ?? null;
}
async function seekToEnd(page: Page): Promise<void> {
	await simulateProgressThenRestart(page, 0.995);
}
/**
 * Reports `fraction` of the duration and then a restart at 0 through the player's progress state, so the
 * feature either sees a completed playthrough (fraction >= 0.99, its near-end threshold) or a restart that
 * never came close to the end.
 */
async function simulateProgressThenRestart(page: Page, fraction: number): Promise<void> {
	await page.mouse.move(500, 300);
	await page.evaluate(async (fraction) => {
		const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
		for (let i = 0; i < 100; i++) {
			const p = document.querySelector<YouTubePlayerDiv>("#shorts-player");
			if (p) {
				const v = p.querySelector<HTMLVideoElement>("video");
				if (v && Number.isFinite(v.duration) && v.duration > 0 && typeof p.getProgressState === "function") break;
			}
			await delay(100);
		}
		const player = document.querySelector<YouTubePlayerDiv>("#shorts-player")!;
		player.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
		player.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
		player.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
		const video = player.querySelector<HTMLVideoElement>("video")!;
		const originalGetProgressState = player.getProgressState.bind(player);
		const { duration } = originalGetProgressState();
		let current = duration * fraction;
		player.getProgressState = () => ({
			...originalGetProgressState(),
			current,
			duration
		});
		video.dispatchEvent(new Event("timeupdate"));
		current = 0;
		video.dispatchEvent(new Event("timeupdate"));
	}, fraction);
}
/**
 * Returns to the shorts page through history, which YouTube handles in-page: leaving shorts fails the
 * feature's page dependency and disables it, coming back has to enable it again.
 */
async function spaNavigateBackToShorts(page: Page): Promise<void> {
	await page.goBack();
	await page.waitForURL(/\/shorts\//, { timeout: 30_000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
	await expect(page.locator("#shorts-player video")).toBeAttached({ timeout: 30_000 });
}
test.describe("shortsAutoScroll", () => {
	for (const pageType of testPages) {
		test(`should automatically scroll when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expectAutoScroll(page, initialId);
		});
		test(`should not automatically scroll when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expectNoAutoScroll(page, initialId);
		});
		test(`should toggle auto-scroll on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expectAutoScroll(page, initialId);
			// Disabled in place: navigating again would install fresh listeners, so nothing would observe that
			// onDisable removed the timeupdate listener.
			await disableFeature(page, "shortsAutoScroll.enabled");
			const disabledId = getShortId(page.url());
			await seekToEnd(page);
			await expectNoAutoScroll(page, disabledId);
			await enableFeature(page, "shortsAutoScroll.enabled");
			await seekToEnd(page);
			await expectAutoScroll(page, disabledId);
		});
		test(`should keep auto-scrolling on the next short after an advance on ${pageType}`, async ({ page }) => {
			test.setTimeout(120_000);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shortsAutoScroll.enabled");
			const firstId = getShortId(page.url());
			await seekToEnd(page);
			await expectAutoScroll(page, firstId);
			// The advance is an in-page navigation, so the second scroll can only happen if the feature
			// re-attached its timeupdate listener afterwards.
			const secondId = getShortId(page.url());
			expect(secondId).not.toBeNull();
			await seekToEnd(page);
			await expectAutoScroll(page, secondId);
		});
		test(`should persist auto-scroll after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shortsAutoScroll.enabled");
			const initialId = getShortId(page.url());
			await seekToEnd(page);
			await expectAutoScroll(page, initialId);
			// The URL is the advanced short now, so navigateToPageType would goto the fixture and discard the
			// reloaded document; reloadPage keeps it and waits for the extension and player instead.
			await reloadPage(page, pageType);
			const newId = getShortId(page.url());
			await seekToEnd(page);
			await expectAutoScroll(page, newId);
		});
	}

	test(`should resume auto-scroll after in-page navigation away from and back to ${shorts}`, async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, shorts);
		await enableFeature(page, "shortsAutoScroll.enabled");
		// Leaving shorts in-page makes the page dependency fail, which disables the feature; coming back has
		// to enable it again. A document load would run onEnable on a fresh page instead.
		await spaNavigateToHome(page);
		await spaNavigateBackToShorts(page);
		const initialId = getShortId(page.url());
		expect(initialId).not.toBeNull();
		await seekToEnd(page);
		await expectAutoScroll(page, initialId);
	});

	test(`should not automatically scroll when the video restarts without reaching the end on ${shorts}`, async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, shorts);
		await enableFeature(page, "shortsAutoScroll.enabled");
		const initialId = getShortId(page.url());
		// Half way through is below the 99% near-end threshold, so this restart must not count as finished.
		await simulateProgressThenRestart(page, 0.5);
		await expectNoAutoScroll(page, initialId);
		// Control: the identical restart after a full playthrough does advance, so the assertion above is the
		// near-end guard rather than a simulation that never reaches the listener.
		await seekToEnd(page);
		await expectAutoScroll(page, initialId);
	});
});
