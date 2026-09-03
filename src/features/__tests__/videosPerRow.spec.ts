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
});
