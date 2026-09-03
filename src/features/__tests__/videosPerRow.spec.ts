import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectBodyWithClass, expectBodyWithoutClass } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";

const { channel_videos: channelVideos, watch } = pageTypeRecord;

// The feature has no page-specific branch; an explicit page set avoids running every test on all 11 page types.
const testPages: PageType[] = [channelVideos, watch];

/** The count itself only reaches the page through this custom property, which the grid CSS reads. */
async function expectVideosPerRowCount(page: Page, count: number): Promise<void> {
	await expect
		.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--yte-videos-per-row-count")), { timeout: 15000 })
		.toBe(String(count));
}

/**
 * The number of grid columns actually laid out, taken as the size of the widest rendered row. Every tile in a row
 * shares its top offset, so tiles are grouped by that. Left offsets cannot be used: the channel grid is laid out with
 * flex and shifts a few pixels horizontally while the feed loads, which counts a single column more than once.
 */
async function getRenderedColumnCount(page: Page): Promise<number> {
	return page.evaluate(() => {
		const tops = Array.from(document.querySelectorAll<HTMLElement>("ytd-rich-grid-renderer ytd-rich-item-renderer"))
			.map((tile) => tile.getBoundingClientRect())
			.filter((rect) => rect.width > 0 && rect.height > 0)
			.map(({ top }) => top)
			.sort((a, b) => a - b);
		let widest = 0;
		let rowTop = -Infinity;
		let inRow = 0;
		for (const top of tops) {
			if (Math.abs(top - rowTop) > 4) {
				rowTop = top;
				inRow = 1;
			} else {
				inRow++;
			}
			widest = Math.max(widest, inRow);
		}
		return widest;
	});
}

test.describe("videosPerRow", () => {
	for (const pageType of testPages) {
		test(`should set videos per row on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "videosPerRow.videosPerRow", 6);
			await enableFeature(page, "videosPerRow.enabled");
			await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
			await expectVideosPerRowCount(page, 6);
		});
		test(`persists videos per row after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "videosPerRow.videosPerRow", 6);
			await enableFeature(page, "videosPerRow.enabled");
			await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
			await expectVideosPerRowCount(page, 6);
			await reloadPage(page, pageType);
			await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
			await expectVideosPerRowCount(page, 6);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "videosPerRow.videosPerRow", 6);
			await enableFeature(page, "videosPerRow.enabled");
			await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
			await disableFeature(page, "videosPerRow.enabled");
			await expectBodyWithoutClass(page, "yte-videos-per-row", { timeout: 15000 });
			await enableFeature(page, "videosPerRow.enabled");
			await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
		});
		test(`should update on config change on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "videosPerRow.videosPerRow", 6);
			await enableFeature(page, "videosPerRow.enabled");
			await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
			await expectVideosPerRowCount(page, 6);
			await setOption(page, "videosPerRow.videosPerRow", 8);
			await expectVideosPerRowCount(page, 8);
		});
	}

	test(`renders the configured number of grid columns on ${channelVideos}`, async ({ page }) => {
		await navigateToPageType(page, channelVideos);
		// The suite runs at 1280px wide, where the stylesheet clamps to min(4, count), so only counts up to 4 reach the grid.
		await setOption(page, "videosPerRow.videosPerRow", 2);
		await enableFeature(page, "videosPerRow.enabled");
		await expectBodyWithClass(page, "yte-videos-per-row", { timeout: 15000 });
		await expectVideosPerRowCount(page, 2);
		await expect.poll(() => getRenderedColumnCount(page), { timeout: 15000 }).toBe(2);
		await setOption(page, "videosPerRow.videosPerRow", 3);
		await expectVideosPerRowCount(page, 3);
		await expect.poll(() => getRenderedColumnCount(page), { timeout: 15000 }).toBe(3);
	});
	test(`removes the count variable when disabled on ${channelVideos}`, async ({ page }) => {
		await navigateToPageType(page, channelVideos);
		await setOption(page, "videosPerRow.videosPerRow", 6);
		await enableFeature(page, "videosPerRow.enabled");
		await expectVideosPerRowCount(page, 6);
		await disableFeature(page, "videosPerRow.enabled");
		await expectBodyWithoutClass(page, "yte-videos-per-row", { timeout: 15000 });
		// onDisable removes the property as well; leaving it behind would resurface the stale count when the class returns.
		await expect
			.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--yte-videos-per-row-count")), { timeout: 10000 })
			.toBe("");
	});
});
