import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/automaticallyShowMoreVideosOnEndScreen/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";
import { getValueFromYouTubePlayer } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { watch } = pageTypeRecord;
/**
 * One attempt at getting the player to the end: seeks back to the end when the video is playing from somewhere
 * else and resumes it when it is paused, then reports whether the end screen is up.
 *
 * Both nudges have to be repeated rather than done once: only muted playback may be started from a script, and
 * the error watcher in pageSetup reloads the page when YouTube errors out, which puts the video back at the start.
 */
async function isAtEndScreen(page: Page, target: number): Promise<boolean> {
	return page.evaluate(async (seekTarget) => {
		const isEnded = () => document.querySelector("#movie_player.ended-mode") !== null;
		if (isEnded()) return true;
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		const video = document.querySelector<HTMLVideoElement>(".html5-main-video");
		if (!player || !video) return false;
		video.muted = true;
		if (video.currentTime < seekTarget - 5) await player.seekTo(seekTarget, true);
		if (video.paused) await video.play().catch(() => {});
		return isEnded();
	}, target);
}
/**
 * Seeks to just before the end and plays, so the player reaches ended-mode without waiting out the whole video.
 * Resolves to whether the player got there, so a video that never ends can be skipped instead of failing.
 */
async function playToEnd(page: Page): Promise<boolean> {
	// A player that has not started reports a duration of 0, and seeking to that would play the whole video.
	await expect.poll(async () => getValueFromYouTubePlayer(page, "getDuration", watch), { intervals: [500], timeout: 30000 }).toBeGreaterThan(0);
	const duration = (await getValueFromYouTubePlayer(page, "getDuration", watch)) ?? 0;
	const target = Math.max(0, duration - 1);
	try {
		await expect.poll(async () => isAtEndScreen(page, target), { intervals: [1000], timeout: 60000 }).toBe(true);
	} catch {
		return false;
	}
	return true;
}
/** Switches YouTube's own autoplay off through its toggle, so the ended video stays on screen. */
async function turnOffAutoPlay(page: Page): Promise<void> {
	const toggleState = page.locator(".ytp-autonav-toggle-button");
	await expect(toggleState).toHaveAttribute("aria-checked", /^(true|false)$/);
	if ((await toggleState.getAttribute("aria-checked")) === "false") return;
	await page.locator(".ytp-autonav-toggle").evaluate((el) => (el as HTMLButtonElement).click());
	await expect(toggleState).toHaveAttribute("aria-checked", "false");
}

test.describe("automaticallyShowMoreVideosOnEndScreen", () => {
	for (const pageType of testPages) {
		test(`should add show more videos classes on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
		});
		test(`should persist show more videos classes after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
			// Hop to a page the includePages gate excludes, so the classes have to be absent there and can only come
			// back because the feature ran again after navigating back.
			await navigateToPageType(page, nonTargetPage!);
			await expectBodyWithoutClass(page, "yte-show-html5-endscreen");
			await expectBodyWithoutClass(page, "yte-hide-ytp-fullscreen-grid");
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
		});
		test(`persists show more videos classes after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
			await reloadPage(page, pageType);
			await expectBodyWithClass(page, "yte-show-html5-endscreen", { timeout: 15000 });
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid", { timeout: 15000 });
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
			await disableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithoutClass(page, "yte-show-html5-endscreen");
			await expectBodyWithoutClass(page, "yte-hide-ytp-fullscreen-grid");
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
		});
	}

	test(`should not add show more videos classes on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
		await expectBodyWithoutClass(page, "yte-show-html5-endscreen");
		await expectBodyWithoutClass(page, "yte-hide-ytp-fullscreen-grid");
	});

	// Watch only: the CSS rule is keyed on #movie_player.ended-mode, which only exists on a watch page.
	test(`shows the html5 end screen when the video ends on ${watch}`, async ({ page }) => {
		// The video has to be played to its end, which the default per-test budget does not allow for.
		test.setTimeout(120_000);
		await navigateToPageType(page, watch, ["autoPlay"]);
		// With autoplay on YouTube leaves the video for the next one the moment it ends, so the end screen would
		// never be on screen to assert on.
		await turnOffAutoPlay(page);
		await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
		await expectBodyWithClass(page, "yte-show-html5-endscreen");
		test.skip(!(await playToEnd(page)), "this video never reached the html5 end screen");
		const endScreen = page.locator("#movie_player.ended-mode div.html5-endscreen");
		// The body class is only a proxy; this rule is the whole user-visible payload of the feature.
		await expect(endScreen).toHaveCSS("display", "block");
		await disableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
		await expectBodyWithoutClass(page, "yte-show-html5-endscreen");
		await expect(endScreen).toHaveCSS("display", "none");
	});
});
