import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { metadata } from "@/src/features/timestampPeek/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

const OVERLAY = "#yte-timestamp-peek-overlay";
const PLACEHOLDER = "#yte-timestamp-peek-placeholder";
const SHIELD = "#yte-timestamp-peek-hover-shield";

async function expandDescription(page: Page) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			await page.evaluate(() => {
				const moreButton = document.querySelector<HTMLElement>(
					"ytd-video-description-expander #expand, ytd-video-secondary-info-renderer #more, tp-yt-paper-button#more, .ytd-video-secondary-info-renderer #more"
				);
				if (moreButton) moreButton.click();
			});
			break;
		} catch {
			await page.waitForTimeout(500);
		}
	}
}

async function expectCleanSlate(page: Page): Promise<void> {
	await expect(page.locator(OVERLAY)).not.toBeAttached();
	await expect(page.locator(PLACEHOLDER)).not.toBeAttached();
	await expect(page.locator(SHIELD)).not.toBeAttached();
}

async function expectOverlayHidden(page: Page): Promise<void> {
	await expect(page.locator(OVERLAY)).not.toBeAttached();
}

/**
 * The overlay div is also created (display:none) by the mouseleave path, so attachment alone proves
 * nothing. The preview is only really up once the real video element has been moved into the overlay and
 * the placeholder holds its spot in the player.
 */
async function expectOverlayVisible(page: Page): Promise<void> {
	await expect(page.locator(OVERLAY)).toBeVisible({ timeout: 10000 });
	await expect(page.locator(`${OVERLAY} video.html5-main-video`)).toBeAttached({ timeout: 10000 });
	await expect(page.locator(PLACEHOLDER)).toBeAttached({ timeout: 10000 });
}

async function getVideoTime(page: Page): Promise<Nullable<number>> {
	return page.evaluate(() => {
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		return video ? video.currentTime : null;
	});
}

async function hoverFirstTimestamp(page: Page, inComment = false): Promise<void> {
	const timestampLink = page.locator(timestampLinkSelector(page, inComment)).first();
	await expect(timestampLink).toBeAttached({ timeout: 15000 });
	await timestampLink.scrollIntoViewIfNeeded();
	await timestampLink.hover({ force: true });
}

async function isVideoPlaying(page: Page): Promise<boolean> {
	return page.evaluate(() => {
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		return video ? !video.paused : false;
	});
}

async function readTimestampSeconds(page: Page, selector: string): Promise<Nullable<number>> {
	return page.evaluate((sel) => {
		const href = document.querySelector<HTMLAnchorElement>(sel)?.getAttribute("href");
		if (!href) return null;
		const t = new URLSearchParams(href).get("t");
		return t ? parseInt(t, 10) : 0;
	}, selector);
}

async function scrollToComments(page: Page) {
	await expect(page.locator("#comments")).toBeAttached({ timeout: 15000 });
	await page.locator("#comments").scrollIntoViewIfNeeded({ timeout: 5000 });
	await page.waitForTimeout(500);
	await expect(page.locator("ytd-comment-thread-renderer").first()).toBeAttached({ timeout: 30000 });
	await page.waitForTimeout(500);
}

async function setupWatchPage(page: Page, pageType: PageType): Promise<void> {
	await navigateToPageType(page, pageType, ["timestamps"]);
}

/**
 * The feature only attaches listeners to timestamps pointing at the video currently being watched
 * (utils.ts:55), so the test must not pick up a link belonging to some other video.
 */
function timestampLinkSelector(page: Page, inComment = false): string {
	const videoId = new URL(page.url()).searchParams.get("v");
	expect(videoId).not.toBeNull();
	const scope = inComment ? "ytd-comment-thread-renderer" : "#description-inline-expander";
	return `${scope} yt-attributed-string a[href^='/watch?v=${videoId}'][href*='&t=']`;
}

test.describe("timestampPeek", () => {
	for (const pageType of testPages) {
		test(`should show preview overlay when hovering a timestamp in the description on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
		});

		test(`should clean up overlay elements when disabled on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			// All three elements are created lazily on hover, so they have to exist before their removal
			// means anything.
			await expandDescription(page);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
			// Leaving the timestamp is what creates the hover shield.
			await page.mouse.move(0, 0);
			await expect(page.locator(SHIELD)).toBeAttached({ timeout: 5000 });
			await disableFeature(page, "timestampPeek.enabled");
			await expectCleanSlate(page);
			// With the listeners gone, hovering the same timestamp must not bring the overlay back.
			await hoverFirstTimestamp(page);
			await expectToStay(async () => page.locator(OVERLAY).count(), 0, { page });
		});

		test(`should toggle overlay on and off on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
			await disableFeature(page, "timestampPeek.enabled");
			await expectOverlayHidden(page);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);
			await page.mouse.move(0, 0);
			await page.waitForTimeout(200);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
		});

		test(`should clean up the preview overlay after navigation on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
			// Move off the timestamp first so the video is back in the player before navigating; the overlay
			// itself stays attached (only its display is reset), so the assertion below still measures the
			// yt-navigate-start teardown rather than a hide.
			await page.mouse.move(0, 0);
			await expect(page.locator(PLACEHOLDER)).not.toBeAttached({ timeout: 10000 });
			await expect(page.locator(OVERLAY)).toBeAttached();
			// A genuine in-document navigation, which is the only path that fires yt-navigate-start.
			await spaNavigateToRelatedVideo(page);
			await expectCleanSlate(page);
		});

		test(`should show preview overlay after full page reload on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
			await page.reload();
			await navigateToPageType(page, pageType, ["timestamps"]);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
		});

		test(`should show preview overlay when hovering a timestamp in a comment on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await scrollToComments(page);
			await hoverFirstTimestamp(page, true);
			await expectOverlayVisible(page);
		});

		test(`should seek to timestamp when clicking the preview overlay on a comment timestamp on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await scrollToComments(page);

			const selector = timestampLinkSelector(page, true);
			const commentTimestamp = page.locator(selector).first();
			await expect(commentTimestamp).toBeAttached({ timeout: 15000 });

			const expectedTime = await readTimestampSeconds(page, selector);
			expect(expectedTime).not.toBeNull();

			await commentTimestamp.scrollIntoViewIfNeeded();
			await commentTimestamp.hover({ force: true });
			await expectOverlayVisible(page);

			// The click handler re-applies the preview's *current* time, not the link timestamp, and the
			// preview keeps playing while it is open - so the resumed time is only bounded from below.
			const timeBeforeClick = await getVideoTime(page);
			expect(timeBeforeClick).not.toBeNull();

			await page.locator(OVERLAY).dispatchEvent("click");

			await expect
				.poll(async () => getVideoTime(page), { intervals: [100], timeout: 5000 })
				.toBeGreaterThanOrEqual(Math.max(expectedTime!, timeBeforeClick! - 0.5));
			await expect.poll(async () => isVideoPlaying(page), { intervals: [100], timeout: 5000 }).toBe(true);
		});

		test(`should stay paused when restoring video time on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);

			const preHoverTime = await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (!video) return null;
				video.pause();
				return video.currentTime;
			});
			expect(preHoverTime).not.toBeNull();

			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);

			await page.locator(OVERLAY).dispatchEvent("mouseleave", {
				relatedTarget: await page.locator("body").elementHandle()
			});

			await expect.poll(async () => getVideoTime(page), { intervals: [200], timeout: 5000 }).toBeCloseTo(preHoverTime!, 0);
			await expect.poll(async () => isVideoPlaying(page), { intervals: [200], timeout: 5000 }).toBe(false);
		});

		test(`should play from timestamp when clicking preview overlay while paused on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);

			const selector = timestampLinkSelector(page);
			const expectedTime = await readTimestampSeconds(page, selector);
			expect(expectedTime).not.toBeNull();

			await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (video) video.pause();
			});

			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);

			// Same bound as the comment case: the click resumes from wherever the preview had reached.
			const timeBeforeClick = await getVideoTime(page);
			expect(timeBeforeClick).not.toBeNull();

			await page.locator(OVERLAY).dispatchEvent("click");

			await expect
				.poll(async () => getVideoTime(page), { intervals: [100], timeout: 5000 })
				.toBeGreaterThanOrEqual(Math.max(expectedTime!, timeBeforeClick! - 0.5));
			await expect.poll(async () => isVideoPlaying(page), { intervals: [100], timeout: 5000 }).toBe(true);
		});
	}
});
