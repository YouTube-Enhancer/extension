import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { pageSetup } from "@/src/utils/_tests/pageSetup";
import { readStoredState } from "@/src/utils/_tests/storage";
const { home, watch } = pageTypeRecord;

type VideoHistoryEntry = { id: string; status: string; timestamp: number };

async function getCurrentTime(page: Page): Promise<number> {
	return await page.evaluate(() => {
		const v = document.querySelector<HTMLVideoElement>("div#movie_player video");
		return v?.currentTime ?? 0;
	});
}

async function isVideoPaused(page: Page): Promise<boolean> {
	return await page.evaluate(() => {
		const v = document.querySelector<HTMLVideoElement>("div#movie_player video");
		return v ? v.paused : true;
	});
}

/**
 * Parks the video inside the end tolerance and pokes the save listener until the stored entry flips to
 * "watched". The video stays paused so it cannot end and auto-advance to the next one.
 */
async function markVideoWatched(page: Page): Promise<void> {
	await expect
		.poll(
			async () => {
				await page.evaluate(async () => {
					const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
					const video = player?.querySelector<HTMLVideoElement>("video");
					if (!player?.getDuration || !player.seekTo || !video) return;
					video.pause();
					const duration = await player.getDuration();
					await player.seekTo(duration - 0.3, true);
					video.dispatchEvent(new Event("pause"));
				});
				return (await readStoredEntry(page))?.status;
			},
			{ timeout: 30000 }
		)
		.toBe("watched");
}

/** Reads the history entry the feature stores for the video currently in the URL. */
async function readStoredEntry(page: Page): Promise<Nullable<VideoHistoryEntry>> {
	const videoId = new URL(page.url()).searchParams.get("v");
	if (!videoId) return null;
	const { videoHistory } = (await readStoredState(page)) as { videoHistory?: { storage?: Record<string, VideoHistoryEntry> } };
	return videoHistory?.storage?.[videoId] ?? null;
}

/**
 * Seeks a quarter into the video so the stored timestamp sits far away from the natural start; otherwise a
 * resume assertion is satisfied by a video that simply keeps playing from 0.
 */
async function seekToQuarterDuration(page: Page): Promise<number> {
	const target = await page.evaluate(async () => {
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		if (!player?.getDuration || !player.seekTo) return null;
		const duration = await player.getDuration();
		if (!duration || duration < 30) return null;
		const seekTarget = Math.floor(duration * 0.25);
		await player.seekTo(seekTarget, true);
		return seekTarget;
	});
	expect(target).not.toBeNull();
	return target!;
}

/** Waits until the feature has persisted a history entry at (or past) `atLeast`, and returns it. */
async function waitForStoredTimestamp(page: Page, atLeast: number): Promise<number> {
	await expect.poll(async () => (await readStoredEntry(page))?.timestamp ?? 0, { timeout: 20000 }).toBeGreaterThanOrEqual(atLeast);
	const entry = await readStoredEntry(page);
	expect(entry?.status).toBe("watching");
	return entry!.timestamp;
}

test.describe("videoHistory", () => {
	test("video history resume prompt button should resume playback when clicked", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		await expect(page.locator("div#movie_player video")).toBeAttached();
		const seekTarget = await seekToQuarterDuration(page);
		const storedTime = await waitForStoredTimestamp(page, seekTarget - 1);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		// The prompt is created at load by onEnable -> handleVideoChange. A disable/enable round trip here
		// would remove it and could not rebuild it, because currentVideoId is never reset.
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).toBeAttached({ timeout: 15000 });
		const resumeButton = page.locator("#resume-prompt-button");
		await expect(resumeButton).toBeVisible();
		await resumeButton.click();
		await expect.poll(async () => getCurrentTime(page), { timeout: 15000 }).toBeGreaterThan(storedTime - 2);
		await expect.poll(async () => isVideoPaused(page), { timeout: 15000 }).toBe(false);
	});
	test("video history close button should hide the resume prompt", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		// A currentTime > 0 does not imply a stored entry (the handler ignores times below 1 s), so wait for
		// the entry itself before navigating away.
		const seekTarget = await seekToQuarterDuration(page);
		await waitForStoredTimestamp(page, seekTarget - 1);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).toBeAttached({ timeout: 15000 });
		const closeButton = page.locator("#resume-prompt-close-button");
		await expect(closeButton).toBeVisible();
		await closeButton.click();
		await expect(resumePrompt).not.toBeVisible();
	});
	test("video history should automatically resume when navigating back", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "automatic");
		await expect(page.locator("div#movie_player video")).toBeAttached();
		const seekTarget = await seekToQuarterDuration(page);
		const storedTime = await waitForStoredTimestamp(page, seekTarget - 1);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		// seekTo is asynchronous, so a single read as soon as the video is decodable races the extension.
		await expect.poll(async () => getCurrentTime(page), { timeout: 20000 }).toBeGreaterThan(storedTime - 2);
		await expect(page.locator("#resume-prompt")).not.toBeAttached();
	});
	test("in-page navigation to another video clears the old prompt and tracks the new video", async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		const seekTarget = await seekToQuarterDuration(page);
		await waitForStoredTimestamp(page, seekTarget - 1);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await expect(page.locator("#resume-prompt")).toBeAttached({ timeout: 15000 });
		const previousVideoId = new URL(page.url()).searchParams.get("v");
		// A genuine in-document navigation: onNavigate has to drop the prompt for the video being left and
		// start tracking the video being entered.
		await spaNavigateToRelatedVideo(page);
		expect(new URL(page.url()).searchParams.get("v")).not.toBe(previousVideoId);
		await expect(page.locator("#resume-prompt")).not.toBeAttached();
		// A pre-roll can start right after the navigation, once the helper's own ad handling has finished, and
		// nothing is written to the history while an ad holds the video element.
		await pageSetup(page);
		await expect(page.locator("#movie_player.ad-showing")).toHaveCount(0, { timeout: 60_000 });
		// The entry is written by the timeupdate listener, so the video that was navigated to has to play past
		// the handler's 1 s floor before there is anything to read.
		await page.evaluate(async () => {
			const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
			await player?.playVideo?.();
		});
		await expect.poll(async () => getCurrentTime(page), { timeout: 20000 }).toBeGreaterThan(2);
		// readStoredEntry keys off the URL, so this is an entry for the video that was navigated to.
		await waitForStoredTimestamp(page, 1);
	});
	test("disabling video history removes the visible resume prompt", async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		const seekTarget = await seekToQuarterDuration(page);
		await waitForStoredTimestamp(page, seekTarget - 1);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).toBeAttached({ timeout: 15000 });
		// Disabled in place, with the prompt on screen: onDisable has to take it off the player.
		await disableFeature(page, "videoHistory.enabled");
		await expect(resumePrompt).not.toBeAttached();
	});
	test("no resume prompt for a video already marked watched", async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		const seekTarget = await seekToQuarterDuration(page);
		await waitForStoredTimestamp(page, seekTarget - 1);
		// The same history entry that produced a prompt in the tests above, but now flipped to "watched".
		await markVideoWatched(page);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await expectToStay(async () => page.locator("#resume-prompt").count(), 0, { page });
	});
	test("video history resume prompt should not appear when disabled", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		// The feature defaults to disabled, so disabling straight away is a no-op and nothing is observed.
		// Build a real history entry first, then disable and check it stops being used and updated.
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		const seekTarget = await seekToQuarterDuration(page);
		const storedTime = await waitForStoredTimestamp(page, seekTarget - 1);
		await disableFeature(page, "videoHistory.enabled");
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await expectToStay(async () => page.locator("#resume-prompt").count(), 0, { page });
		// With the listeners removed the stored timestamp must not advance either.
		expect((await readStoredEntry(page))?.timestamp).toBe(storedTime);
	});
});
