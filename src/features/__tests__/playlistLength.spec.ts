import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { Nullable } from "@/src/types";

import { metadata } from "@/src/features/playlistLength/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const pageTypes = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { watch } = pageTypeRecord;
const UI = {
	percent: "#yte-playlist-length-ui-percentageWatched",
	root: "#yte-playlist-length-ui",
	times: "#yte-playlist-length-ui-times"
} as const;

async function enablePlaylistLength(page: Page, pageType: string): Promise<void> {
	await waitForPlaylist(page, pageType);
	await disableFeature(page, "playlistLength.enabled");
	await enableFeature(page, "playlistLength.enabled");
}

async function expectUIHidden(page: Page): Promise<void> {
	await expect(page.locator(UI.root)).toHaveCount(0);
}

async function expectUIVisible(page: Page): Promise<void> {
	await expect(page.locator(UI.root)).toBeVisible({ timeout: 15000 });
	await expect(page.locator(UI.times)).not.toHaveText("");
	await expect(page.locator(UI.percent)).toContainText("%");
}

async function getTimes(page: Page): Promise<Nullable<string>> {
	return await page.locator(UI.times).textContent();
}
/** Reads the total segment of `watched / total (- remaining)` in seconds. */
async function getTotalSeconds(page: Page): Promise<Nullable<number>> {
	const times = await getTimes(page);
	const total = times?.split(" / ")[1]?.split(" (")[0];
	if (!total) return null;
	return total.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}

async function waitForPlaylist(page: Page, pageType: string): Promise<void> {
	if (pageType !== "playlist") return;
	// The containers the controller reads its items from. Awaiting them replaces a swallowed selector
	// timeout followed by an unconditional 2 s sleep.
	await expect(page.locator("ytd-playlist-video-list-renderer div#contents > *, yt-item-section-renderer div#contents > *").first()).toBeVisible({
		timeout: 15000
	});
}

test.describe("playlistLength", () => {
	for (const pageType of pageTypes) {
		test(`should render UI when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await enablePlaylistLength(page, pageType);
			await expectUIVisible(page);
		});
		test(`should not render UI when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await disableFeature(page, "playlistLength.enabled");
			await expectUIHidden(page);
		});
		test(`should re-enable UI after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await enablePlaylistLength(page, pageType);
			await expectUIVisible(page);
			await disableFeature(page, "playlistLength.enabled");
			await expectUIHidden(page);
			await enableFeature(page, "playlistLength.enabled");
			await expectUIVisible(page);
		});
		test(`should persist UI after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await enablePlaylistLength(page, pageType);
			await expectUIVisible(page);
			await page.reload();
			// navigateToPageType only performs the readiness/ads wait here; re-enabling would replace the
			// reloaded state with a fresh onEnable and hide a broken reload path.
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await expectUIVisible(page);
		});
	}
	test("should update UI when playback rate changes (watch only behavior)", async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistLength.enabled");
		await expectUIVisible(page);
		const totalBefore = await getTotalSeconds(page);
		expect(totalBefore).toBeTruthy();
		// The watched time advances on its own, so only the total (playlist duration / playbackRate) is a
		// valid observation. The video keeps playing so the timeupdate listener drives the recomputation.
		await page.locator("video").evaluate(async (video: HTMLVideoElement) => {
			video.playbackRate = 2;
			await video.play().catch(() => {});
		});
		await expect.poll(async () => getTotalSeconds(page), { timeout: 15000 }).toBeCloseTo(Math.floor(totalBefore! / 2), -1);
	});

	test("should not render UI on non-target page", async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await disableFeature(page, "playlistLength.enabled");
		await enableFeature(page, "playlistLength.enabled");
		await expect(page.locator(UI.root)).toHaveCount(0);
	});
});
