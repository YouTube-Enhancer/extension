import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/remainingTime/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { setValueOnYouTubePlayer } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, watch } = pageTypeRecord;
// The insertion point the feature actually uses (index.ts:56, 71).
const REMAINING_TIME_SELECTOR = ".ytp-time-display > .ytp-time-wrapper > .ytp-time-contents > span#ytp-time-remaining";
// ` (-M:SS)`, ` (-H:MM:SS)` or ` (-<seconds>)`; a zero remaining time would mean the arithmetic is broken.
const REMAINING_TIME_TEXT = /^ \(-(\d+(:\d{2}){1,3}|[1-9]\d*)\)$/;

/** Forces one `timeupdate` so the listener recomputes without waiting for playback to tick. */
async function dispatchTimeUpdate(page: Page): Promise<void> {
	await page.evaluate(() => {
		document.querySelector<HTMLVideoElement>("div#movie_player video")?.dispatchEvent(new Event("timeupdate"));
	});
}

/** The remaining wall-clock seconds the player itself reports, i.e. what the span has to be showing. */
async function getPlayerRemainingSeconds(page: Page): Promise<Nullable<number>> {
	return page.evaluate(async () => {
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		const video = player?.querySelector<HTMLVideoElement>("video");
		if (!player?.getDuration || !player.getCurrentTime || !video) return null;
		const [duration, currentTime] = await Promise.all([player.getDuration(), player.getCurrentTime()]);
		return (duration - currentTime) / video.playbackRate;
	});
}

/** Turns the rendered ` (-1:02:03)` / ` (-2:03)` / ` (-45)` text back into seconds. */
function parseRemainingSeconds(text: Nullable<string>): Nullable<number> {
	const match = text?.match(/^ \(-([\d:]+)\)$/);
	if (!match) return null;
	return match[1].split(":").reduce((total, part) => total * 60 + Number.parseInt(part, 10), 0);
}

async function readRemainingSeconds(page: Page): Promise<Nullable<number>> {
	return parseRemainingSeconds(await page.locator(REMAINING_TIME_SELECTOR).textContent());
}

test.describe("remainingTime", () => {
	for (const pageType of testPages) {
		test(`remaining time should be displayed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "remainingTime.enabled");
			const remainingTimeElement = page.locator(REMAINING_TIME_SELECTOR);
			await expect(remainingTimeElement).toBeAttached();
			// textContent, not toHaveText: the latter normalizes whitespace and would drop the leading space.
			await expect.poll(async () => remainingTimeElement.textContent(), { timeout: 10000 }).toMatch(REMAINING_TIME_TEXT);
		});
		test(`remaining time shouldn't be displayed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "remainingTime.enabled");
			const remainingTimeElement = page.locator("span#ytp-time-remaining");
			await expect(remainingTimeElement).not.toBeAttached();
		});
		test(`remaining time should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "remainingTime.enabled");
			await expect(page.locator("span#ytp-time-remaining")).toBeAttached();
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			// No disable/enable round trip: the assertion has to observe what the navigation produced.
			await expect(page.locator("span#ytp-time-remaining")).toBeAttached({ timeout: 10000 });
		});
	}

	// The cases below run on watch only: the feature has no page-specific branch besides the live short-circuit
	// (index.ts:62), and every one of them needs a non-live video to have a remaining time at all.
	test(`remaining time should update while the video plays on ${watch}`, async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch);
		await enableFeature(page, "remainingTime.enabled");
		const remainingTimeElement = page.locator(REMAINING_TIME_SELECTOR);
		await expect(remainingTimeElement).toBeAttached();
		await expect.poll(async () => remainingTimeElement.textContent(), { timeout: 10000 }).toMatch(REMAINING_TIME_TEXT);
		const initial = await readRemainingSeconds(page);
		expect(initial).not.toBeNull();
		await page.evaluate(async () => {
			const video = document.querySelector<HTMLVideoElement>("div#movie_player video");
			if (!video) return;
			try {
				await video.play();
			} catch {}
		});
		// Without the timeupdate listener the span keeps the value it was seeded with at setup time.
		await expect.poll(async () => readRemainingSeconds(page), { timeout: 30000 }).toBeLessThanOrEqual(initial! - 2);
	});

	test(`remaining time should be removed when the feature is disabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		// Enabling first is what makes this observe onDisable instead of the shipped default.
		await enableFeature(page, "remainingTime.enabled");
		await expect(page.locator(REMAINING_TIME_SELECTOR)).toBeAttached();
		await disableFeature(page, "remainingTime.enabled");
		await expect(page.locator("span#ytp-time-remaining")).not.toBeAttached();
		await enableFeature(page, "remainingTime.enabled");
		await expect(page.locator(REMAINING_TIME_SELECTOR)).toBeAttached();
	});

	test(`remaining time should halve when the playback rate doubles on ${watch}`, async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch);
		await enableFeature(page, "remainingTime.enabled");
		// Pausing pins currentTime, so the playback rate divisor is the only thing left that can move the value.
		await page.evaluate(() => document.querySelector<HTMLVideoElement>("div#movie_player video")?.pause());
		await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", 1);
		await expect.poll(async () => page.locator(REMAINING_TIME_SELECTOR).textContent(), { timeout: 10000 }).toMatch(REMAINING_TIME_TEXT);
		await dispatchTimeUpdate(page);
		const atNormalSpeed = await readRemainingSeconds(page);
		expect(atNormalSpeed).not.toBeNull();
		await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", 2);
		// The value is remaining wall-clock time, not remaining media time.
		await expect
			.poll(
				async () => {
					await dispatchTimeUpdate(page);
					return readRemainingSeconds(page);
				},
				{ timeout: 15000 }
			)
			.toBeLessThanOrEqual(atNormalSpeed! / 2 + 2);
		expect(await readRemainingSeconds(page)).toBeGreaterThanOrEqual(atNormalSpeed! / 2 - 2);
	});

	test(`remaining time should not duplicate after in-page navigation to another video on ${watch}`, async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch);
		await enableFeature(page, "remainingTime.enabled");
		await expect(page.locator(REMAINING_TIME_SELECTOR)).toBeAttached();
		await expect(page.locator("span#ytp-time-remaining")).toHaveCount(1);
		// A genuine in-document navigation, so setupRemainingTime runs again against an existing span.
		await spaNavigateToRelatedVideo(page);
		await expect(page.locator(REMAINING_TIME_SELECTOR)).toBeAttached({ timeout: 15000 });
		await expect(page.locator("span#ytp-time-remaining")).toHaveCount(1);
		// A span left over from the previous video would still hold that video's remaining time.
		await expect
			.poll(
				async () => {
					const [shown, actual] = await Promise.all([readRemainingSeconds(page), getPlayerRemainingSeconds(page)]);
					if (shown === null || actual === null) return null;
					return Math.abs(shown - actual);
				},
				{ timeout: 20000 }
			)
			.toBeLessThanOrEqual(3);
	});

	test(`should not display remaining time on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "remainingTime.enabled");
		await expect(page.locator("span#ytp-time-remaining")).not.toBeAttached();
	});
});
