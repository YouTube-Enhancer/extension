import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/timestampPeek/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home } = pageTypeRecord;

const OVERLAY = "#yte-timestamp-peek-overlay";

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
	await page.waitForTimeout(1000);
}

async function expectCleanSlate(page: Page): Promise<void> {
	await expect(page.locator("#yte-timestamp-peek-overlay")).not.toBeAttached();
	await expect(page.locator("#yte-timestamp-peek-placeholder")).not.toBeAttached();
	await expect(page.locator("#yte-timestamp-peek-hover-shield")).not.toBeAttached();
}

async function expectOverlayHidden(page: Page): Promise<void> {
	await expect(page.locator(OVERLAY)).not.toBeAttached();
}

async function expectOverlayVisible(page: Page): Promise<void> {
	await expect(page.locator(OVERLAY)).toBeAttached({ timeout: 5000 });
}

async function hoverFirstTimestamp(page: Page, inComment = false): Promise<void> {
	const selector = inComment ? "ytd-comment-thread-renderer yt-attributed-string a[href*='&t=']" : "yt-attributed-string a[href*='&t=']";
	const timestampLink = page.locator(selector).first();
	await expect(timestampLink).toBeAttached({ timeout: 15000 });
	await timestampLink.scrollIntoViewIfNeeded();
	await page.waitForTimeout(500);
	await timestampLink.hover({ force: true });
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

test.describe("timestampPeek", () => {
	for (const pageType of testPages) {
		test(`should show preview overlay when hovering a timestamp in the description on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
		});

		test(`should seek to timestamp when clicking the preview overlay on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);

			const timestampLink = page.locator("yt-attributed-string a[href*='&t=']").first();
			await expect(timestampLink).toBeAttached({ timeout: 15000 });

			const expectedTime = await page.evaluate(() => {
				const href = document.querySelector<HTMLAnchorElement>("yt-attributed-string a[href*='&t=']")?.getAttribute("href");
				if (!href) return null;
				const t = new URLSearchParams(href).get("t");
				return t ? parseInt(t, 10) : 0;
			});
			expect(expectedTime).not.toBeNull();

			await timestampLink.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await timestampLink.hover({ force: true });
			await expectOverlayVisible(page);
			await page.waitForTimeout(500);

			await page.locator(OVERLAY).dispatchEvent("click");

			await expect
				.poll(
					async () => {
						const time = await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return null;
							return Math.floor(video.currentTime);
						});
						return time;
					},
					{ intervals: [100], timeout: 5000 }
				)
				.toBe(expectedTime);

			const isPlaying = await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				return video ? !video.paused : false;
			});
			expect(isPlaying).toBe(true);
		});

		test(`should restore video time when leaving the preview overlay on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);

			const timestampLink = page.locator("yt-attributed-string a[href*='&t=']").first();
			await expect(timestampLink).toBeAttached({ timeout: 15000 });

			const preHoverTime = await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (!video) return null;
				video.pause();
				return video.currentTime;
			});
			expect(preHoverTime).not.toBeNull();

			await timestampLink.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await timestampLink.hover({ force: true });
			await expectOverlayVisible(page);
			await page.waitForTimeout(500);

			await page.locator(OVERLAY).dispatchEvent("mouseleave", {
				relatedTarget: await page.locator("body").elementHandle()
			});

			await expect
				.poll(
					async () => {
						const t = await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return null;
							video.pause();
							return video.currentTime;
						});
						return t;
					},
					{ intervals: [200], timeout: 5000 }
				)
				.toBeCloseTo(preHoverTime!, 0);
		});

		test(`should clean up overlay elements when disabled on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await disableFeature(page, "timestampPeek.enabled");
			await expectCleanSlate(page);
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

		test(`should show preview overlay after navigation on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType, ["timestamps"]);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);
			await hoverFirstTimestamp(page);
			await expectOverlayVisible(page);
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

		test(`should show preview overlay after disable then re-enable on ${pageType}`, async ({ page }) => {
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

			const commentTimestamp = page.locator("ytd-comment-thread-renderer yt-attributed-string a[href*='&t=']").first();
			await expect(commentTimestamp).toBeAttached({ timeout: 15000 });

			const expectedTime = await page.evaluate(() => {
				const href = document
					.querySelector<HTMLAnchorElement>("ytd-comment-thread-renderer yt-attributed-string a[href*='&t=']")
					?.getAttribute("href");
				if (!href) return null;
				const t = new URLSearchParams(href).get("t");
				return t ? parseInt(t, 10) : 0;
			});
			expect(expectedTime).not.toBeNull();

			await commentTimestamp.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await commentTimestamp.hover({ force: true });
			await expectOverlayVisible(page);
			await page.waitForTimeout(500);

			await page.locator(OVERLAY).dispatchEvent("click");

			await expect
				.poll(
					async () => {
						const time = await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return null;
							return Math.floor(video.currentTime);
						});
						return time;
					},
					{ intervals: [100], timeout: 5000 }
				)
				.toBe(expectedTime);

			const isPlaying = await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				return video ? !video.paused : false;
			});
			expect(isPlaying).toBe(true);
		});

		test(`should restore video time when leaving the preview overlay on a comment timestamp on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await scrollToComments(page);

			const commentTimestamp = page.locator("ytd-comment-thread-renderer yt-attributed-string a[href*='&t=']").first();
			await expect(commentTimestamp).toBeAttached({ timeout: 15000 });

			const preHoverTime = await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (!video) return null;
				video.pause();
				return video.currentTime;
			});
			expect(preHoverTime).not.toBeNull();

			await commentTimestamp.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await commentTimestamp.hover({ force: true });
			await expectOverlayVisible(page);
			await page.waitForTimeout(500);

			await page.locator(OVERLAY).dispatchEvent("mouseleave", {
				relatedTarget: await page.locator("body").elementHandle()
			});

			await expect
				.poll(
					async () => {
						const t = await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return null;
							video.pause();
							return video.currentTime;
						});
						return t;
					},
					{ intervals: [200], timeout: 5000 }
				)
				.toBeCloseTo(preHoverTime!, 0);
		});

		test(`should stay paused when restoring video time on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);

			const timestampLink = page.locator("yt-attributed-string a[href*='&t=']").first();
			await expect(timestampLink).toBeAttached({ timeout: 15000 });

			const preHoverTime = await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (!video) return null;
				video.pause();
				return video.currentTime;
			});
			expect(preHoverTime).not.toBeNull();

			await timestampLink.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await timestampLink.hover({ force: true });
			await expectOverlayVisible(page);
			await page.waitForTimeout(500);

			await page.locator(OVERLAY).dispatchEvent("mouseleave", {
				relatedTarget: await page.locator("body").elementHandle()
			});

			await expect
				.poll(
					async () => {
						const t = await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return null;
							return video.currentTime;
						});
						return t;
					},
					{ intervals: [200], timeout: 5000 }
				)
				.toBeCloseTo(preHoverTime!, 0);

			await expect
				.poll(
					async () => {
						return await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return true;
							return video.paused;
						});
					},
					{ intervals: [200], timeout: 5000 }
				)
				.toBe(true);
		});

		test(`should play from timestamp when clicking preview overlay while paused on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await expandDescription(page);

			const timestampLink = page.locator("yt-attributed-string a[href*='&t=']").first();
			await expect(timestampLink).toBeAttached({ timeout: 15000 });

			const expectedTime = await page.evaluate(() => {
				const href = document.querySelector<HTMLAnchorElement>("yt-attributed-string a[href*='&t=']")?.getAttribute("href");
				if (!href) return null;
				const t = new URLSearchParams(href).get("t");
				return t ? parseInt(t, 10) : 0;
			});
			expect(expectedTime).not.toBeNull();

			await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (video) video.pause();
			});

			await timestampLink.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await timestampLink.hover({ force: true });
			await expectOverlayVisible(page);
			await page.waitForTimeout(500);

			await page.locator(OVERLAY).dispatchEvent("click");

			await expect
				.poll(
					async () => {
						const time = await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return null;
							return Math.floor(video.currentTime);
						});
						return time;
					},
					{ intervals: [100], timeout: 5000 }
				)
				.toBe(expectedTime);

			const isPlaying = await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				return video ? !video.paused : false;
			});
			expect(isPlaying).toBe(true);
		});

		test(`should stay paused when restoring video time on a comment timestamp on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await scrollToComments(page);

			const commentTimestamp = page.locator("ytd-comment-thread-renderer yt-attributed-string a[href*='&t=']").first();
			await expect(commentTimestamp).toBeAttached({ timeout: 15000 });

			const preHoverTime = await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (!video) return null;
				video.pause();
				return video.currentTime;
			});
			expect(preHoverTime).not.toBeNull();

			await commentTimestamp.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await commentTimestamp.hover({ force: true });
			await expectOverlayVisible(page);
			await page.waitForTimeout(500);

			await page.locator(OVERLAY).dispatchEvent("mouseleave", {
				relatedTarget: await page.locator("body").elementHandle()
			});

			await expect
				.poll(
					async () => {
						const t = await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return null;
							return video.currentTime;
						});
						return t;
					},
					{ intervals: [200], timeout: 5000 }
				)
				.toBeCloseTo(preHoverTime!, 0);

			await expect
				.poll(
					async () => {
						return await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return true;
							return video.paused;
						});
					},
					{ intervals: [200], timeout: 5000 }
				)
				.toBe(true);
		});

		test(`should play from timestamp when clicking preview overlay while paused on a comment timestamp on ${pageType}`, async ({ page }) => {
			await setupWatchPage(page, pageType);
			await enableFeature(page, "timestampPeek.enabled");
			await scrollToComments(page);

			const commentTimestamp = page.locator("ytd-comment-thread-renderer yt-attributed-string a[href*='&t=']").first();
			await expect(commentTimestamp).toBeAttached({ timeout: 15000 });

			const expectedTime = await page.evaluate(() => {
				const href = document
					.querySelector<HTMLAnchorElement>("ytd-comment-thread-renderer yt-attributed-string a[href*='&t=']")
					?.getAttribute("href");
				if (!href) return null;
				const t = new URLSearchParams(href).get("t");
				return t ? parseInt(t, 10) : 0;
			});
			expect(expectedTime).not.toBeNull();

			await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				if (video) video.pause();
			});

			await commentTimestamp.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await commentTimestamp.hover({ force: true });
			await expectOverlayVisible(page);
			await page.waitForTimeout(500);

			await page.locator(OVERLAY).dispatchEvent("click");

			await expect
				.poll(
					async () => {
						const time = await page.evaluate(() => {
							const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
							if (!video) return null;
							return Math.floor(video.currentTime);
						});
						return time;
					},
					{ intervals: [100], timeout: 5000 }
				)
				.toBe(expectedTime);

			const isPlaying = await page.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
				return video ? !video.paused : false;
			});
			expect(isPlaying).toBe(true);
		});
	}

	test(`should not create preview overlay on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "timestampPeek.enabled");
		await expect(page.locator("#yte-timestamp-peek-overlay")).not.toBeAttached();
	});
});
