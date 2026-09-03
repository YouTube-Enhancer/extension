import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";
import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/timestampPeek/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { watch } = pageTypeRecord;
const { right } = placementRecord;

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

/** Identifies the element the real video currently lives in, so re-parenting into the overlay is observable. */
async function getVideoParent(page: Page): Promise<Nullable<string>> {
	return page.evaluate(() => {
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		if (!video) return null;
		const { parentElement } = video;
		if (!parentElement) return null;
		const { className, id } = parentElement;
		return id ? `#${id}` : className;
	});
}

async function getVideoTime(page: Page): Promise<Nullable<number>> {
	return page.evaluate(() => {
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		return video ? video.currentTime : null;
	});
}

async function hoverFirstTimestamp(page: Page, inComment = false): Promise<void> {
	await hoverTimestamp(page, timestampLinkSelector(page, inComment), 0);
}

/** Hovers the timestamp link at `index`, which is what the feature turns into a preview overlay. */
async function hoverTimestamp(page: Page, selector: string, index: number): Promise<void> {
	const timestampLink = page.locator(selector).nth(index);
	await expect(timestampLink).toBeAttached({ timeout: 15000 });
	await timestampLink.scrollIntoViewIfNeeded();
	await timestampLink.hover({ force: true });
}

/**
 * Appends one timestamp link the feature must adopt and two it must ignore - one past the end of the video
 * and one pointing at a different video. They are added after the feature is enabled, so the adoption can
 * only come from the mutation observer.
 */
async function injectTimestampLinks(page: Page): Promise<void> {
	const videoId = new URL(page.url()).searchParams.get("v");
	expect(videoId).not.toBeNull();
	await page.evaluate((videoId) => {
		const container = document.querySelector("#description-inline-expander") ?? document.body;
		const wrapper = document.createElement("yt-attributed-string");
		const otherVideoId = videoId === "dQw4w9WgXcQ" ? "epUk3T2Kfno" : "dQw4w9WgXcQ";
		const links = [
			["yte-test-timestamp-valid", `/watch?v=${videoId}&t=5`],
			["yte-test-timestamp-out-of-range", `/watch?v=${videoId}&t=999999`],
			["yte-test-timestamp-other-video", `/watch?v=${otherVideoId}&t=5`]
		];
		for (const [id, href] of links) {
			const anchor = document.createElement("a");
			anchor.id = id;
			anchor.setAttribute("href", href);
			anchor.textContent = "0:05";
			wrapper.appendChild(anchor);
		}
		container.appendChild(wrapper);
	}, videoId!);
}

async function isVideoPlaying(page: Page): Promise<boolean> {
	return page.evaluate(() => {
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		return video ? !video.paused : false;
	});
}

/**
 * Reads every timestamp the description offers together with the duration they are bounded by, so a test can
 * pick a timestamp that leaves room instead of assuming the first link in the DOM does.
 */
async function readTimestampLinks(page: Page, selector: string): Promise<{ duration: Nullable<number>; timestamps: number[] }> {
	await expect(page.locator(selector).first()).toBeAttached({ timeout: 15000 });
	return page.evaluate(async (sel) => {
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		const timestamps = Array.from(document.querySelectorAll<HTMLAnchorElement>(sel)).map((link) =>
			parseInt(new URLSearchParams(link.getAttribute("href") ?? "").get("t") ?? "0", 10)
		);
		return { duration: player?.getDuration ? await player.getDuration() : null, timestamps };
	}, selector);
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
			// Reading the comments left the page scrolled down, which is what the click handler undoes.
			const scrollBeforeClick = await page.evaluate(() => window.scrollY);
			expect(scrollBeforeClick).toBeGreaterThan(0);

			await page.locator(OVERLAY).dispatchEvent("click");

			await expect
				.poll(async () => getVideoTime(page), { intervals: [100], timeout: 5000 })
				.toBeGreaterThanOrEqual(Math.max(expectedTime!, timeBeforeClick! - 0.5));
			await expect.poll(async () => isVideoPlaying(page), { intervals: [100], timeout: 5000 }).toBe(true);
			// The handler scrolls back to the player so the resumed video is on screen.
			await expect.poll(async () => page.evaluate(() => window.scrollY), { intervals: [100], timeout: 10000 }).toBe(0);
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

	// The cases below run on watch only, which is the feature's only page; they are written against `watch`
	// directly because each one drives a single, specific interaction rather than a per-page smoke test.
	test(`should return the video element to the player and remove the placeholder after leaving the preview on ${watch}`, async ({ page }) => {
		await setupWatchPage(page, watch);
		await enableFeature(page, "timestampPeek.enabled");
		await expandDescription(page);
		const originalParent = await getVideoParent(page);
		expect(originalParent).not.toBeNull();
		await hoverFirstTimestamp(page);
		await expectOverlayVisible(page);
		// The preview borrows YouTube's real video element instead of creating a second one.
		expect(await getVideoParent(page)).toBe("#yte-timestamp-peek-overlay");
		await page.mouse.move(0, 0);
		await expect(page.locator(PLACEHOLDER)).not.toBeAttached({ timeout: 10000 });
		await expect(page.locator(`${OVERLAY} video.html5-main-video`)).not.toBeAttached();
		await expect(page.locator("#movie_player video.html5-main-video")).toBeAttached();
		expect(await getVideoParent(page)).toBe(originalParent);
	});

	test(`should keep the preview open while the pointer travels from the timestamp into the overlay on ${watch}`, async ({ page }) => {
		await setupWatchPage(page, watch);
		await enableFeature(page, "timestampPeek.enabled");
		await expandDescription(page);
		await hoverFirstTimestamp(page);
		await expectOverlayVisible(page);
		// The grace timer is 450 ms, so both events are dispatched in one evaluate to land inside it - the
		// mouseleave raises the shield that bridges the gap, the overlay mouseenter has to cancel the hide.
		await page.evaluate(
			({ linkSelector, overlaySelector }) => {
				const link = document.querySelector(linkSelector);
				const overlay = document.querySelector(overlaySelector);
				if (!link || !overlay) throw new Error("timestamp link or preview overlay not found");
				link.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true, relatedTarget: overlay }));
				overlay.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, relatedTarget: link }));
			},
			{ linkSelector: timestampLinkSelector(page), overlaySelector: OVERLAY }
		);
		await expect(page.locator(SHIELD)).toBeVisible({ timeout: 5000 });
		// A hide that was not cancelled would have put the video back long before the settle window ends.
		await expectToStay(async () => page.locator(`${OVERLAY} video.html5-main-video`).count(), 1, { page });
		await expect(page.locator(PLACEHOLDER)).toBeAttached();
	});

	test(`should keep the preview time when the timestamp link itself is clicked on ${watch}`, async ({ page }) => {
		await setupWatchPage(page, watch);
		await enableFeature(page, "timestampPeek.enabled");
		await expandDescription(page);
		const selector = timestampLinkSelector(page);
		const { duration, timestamps } = await readTimestampLinks(page, selector);
		expect(timestamps.length).toBeGreaterThan(0);
		expect(duration).not.toBeNull();
		// The video has to be parked past the timestamp being previewed for a restore of the pre-hover time to
		// be unmistakable, and this fixture is only ~15 s long, so preview the earliest timestamp the
		// description offers rather than assuming the first link in the DOM leaves room before the end.
		const linkIndex = timestamps.indexOf(Math.min(...timestamps));
		const { [linkIndex]: linkTimestamp } = timestamps;
		// Paused, so a restore would be doubly visible: it seeks back to `parkedTime` *and* pauses again.
		const parkedTime = await page.evaluate(
			({ duration, timestamp }) => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (!video) return null;
				video.pause();
				const target = Math.min(duration - 2, timestamp + 60);
				video.currentTime = target;
				return target;
			},
			{ duration: duration!, timestamp: linkTimestamp }
		);
		expect(parkedTime).not.toBeNull();
		expect(parkedTime! - linkTimestamp).toBeGreaterThan(5);
		await hoverTimestamp(page, selector, linkIndex);
		await expectOverlayVisible(page);
		await expect.poll(async () => getVideoTime(page), { timeout: 10000 }).toBeLessThan(parkedTime! - 2);
		// pointerdown commits the seek; leaving the link right after it still schedules the restore, which now
		// has to leave the committed time alone. The pointer is moved away for real rather than by a synthetic
		// mouseleave: with the cursor still resting on the link, closing the preview shifts the video back and
		// the browser hovers it again, which would reopen the preview.
		const timestampLink = page.locator(selector).nth(linkIndex);
		await timestampLink.dispatchEvent("pointerdown", { button: 0 });
		await page.mouse.move(0, 0);
		await expect(page.locator(PLACEHOLDER)).not.toBeAttached({ timeout: 10000 });
		// The preview plays on from its own time: it never jumps back to `parkedTime` and never pauses.
		await expectToStay(async () => (await getVideoTime(page))! < parkedTime! - 1 && (await isVideoPlaying(page)), true, { page });
	});

	test(`should ignore timestamps beyond the video duration and links to other videos on ${watch}`, async ({ page }) => {
		await setupWatchPage(page, watch);
		await enableFeature(page, "timestampPeek.enabled");
		await injectTimestampLinks(page);
		// Control: an injected link inside this video's duration is adopted by the observer, so the two
		// assertions below measure the filters rather than a failed injection.
		await page.locator("#yte-test-timestamp-valid").dispatchEvent("mouseenter");
		await expectOverlayVisible(page);
		await page.locator("#yte-test-timestamp-valid").dispatchEvent("mouseleave");
		await expect(page.locator(PLACEHOLDER)).not.toBeAttached({ timeout: 10000 });
		for (const ignoredLink of ["#yte-test-timestamp-out-of-range", "#yte-test-timestamp-other-video"]) {
			await page.locator(ignoredLink).dispatchEvent("mouseenter");
			await expectToStay(async () => page.locator(`${OVERLAY} video.html5-main-video`).count(), 0, { page });
		}
	});

	test(`should hide and restore the mini player overlay while previewing on ${watch}`, async ({ page }) => {
		test.setTimeout(120_000);
		await setupWatchPage(page, watch);
		await enableFeature(page, "timestampPeek.enabled");
		await expandDescription(page);
		// Both features borrow the same player: the mini player moves #movie_player into its overlay, the
		// preview moves the video out of it.
		await enableFeature(page, "miniPlayer.enabled");
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await clickFeatureButton(page, watch, "yte-feature-miniPlayerButton-button", right);
		await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		const miniPlayerOverlay = page.locator("#yte-mini-player-overlay");
		await expect(miniPlayerOverlay).toHaveCSS("display", "block");
		// Dispatched rather than hovered: the floating mini player can sit over the description.
		const timestampLink = page.locator(timestampLinkSelector(page)).first();
		await expect(timestampLink).toBeAttached({ timeout: 15000 });
		await timestampLink.dispatchEvent("mouseenter");
		await expectOverlayVisible(page);
		await expect(miniPlayerOverlay).toHaveCSS("display", "none");
		await timestampLink.dispatchEvent("mouseleave");
		await expect(page.locator(PLACEHOLDER)).not.toBeAttached({ timeout: 10000 });
		await expect(miniPlayerOverlay).toHaveCSS("display", "block");
	});
});
