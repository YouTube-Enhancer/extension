import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

// The feature has no page-specific branch; an explicit page set avoids running every test on all 11 page types.
const testPages: PageType[] = ["watch"];

test.describe("hideScrollBar", () => {
	for (const pageType of testPages) {
		test(`scrollbar should be hidden on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideScrollBar.enabled");
			await page.waitForTimeout(1000);
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							return document.documentElement.clientWidth >= window.innerWidth;
						}),
					{ timeout: 10000 }
				)
				.toBe(true);
		});
		test(`scrollbar should be visible when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			// Only test scrollbar visibility if the page naturally has a scrollbar
			const pageHasScrollbar = await page.evaluate(() => {
				return document.documentElement.scrollHeight > window.innerHeight;
			});
			if (!pageHasScrollbar) return;
			await disableFeature(page, "hideScrollBar.enabled");
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							return document.documentElement.clientWidth >= window.innerWidth;
						}),
					{ timeout: 10000 }
				)
				.toBe(false);
		});
		test(`persists scrollbar hide after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideScrollBar.enabled");
			await page.waitForTimeout(1000);
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							return document.documentElement.clientWidth >= window.innerWidth;
						}),
					{ timeout: 10000 }
				)
				.toBe(true);
			await page.reload();
			await navigateToPageType(page, pageType);
			await page.waitForTimeout(1000);
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							return document.documentElement.clientWidth >= window.innerWidth;
						}),
					{ timeout: 10000 }
				)
				.toBe(true);
		});
		test(`re-applies scrollbar hide after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideScrollBar.enabled");
			await page.waitForTimeout(1000);
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							return document.documentElement.clientWidth >= window.innerWidth;
						}),
					{ timeout: 10000 }
				)
				.toBe(true);
			const pageHasScrollbar = await page.evaluate(() => {
				return document.documentElement.scrollHeight > window.innerHeight;
			});
			if (!pageHasScrollbar) return;
			await disableFeature(page, "hideScrollBar.enabled");
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							return document.documentElement.clientWidth >= window.innerWidth;
						}),
					{ timeout: 10000 }
				)
				.toBe(false);
			await enableFeature(page, "hideScrollBar.enabled");
			await page.waitForTimeout(1000);
			await expect
				.poll(
					() =>
						page.evaluate(() => {
							return document.documentElement.clientWidth >= window.innerWidth;
						}),
					{ timeout: 10000 }
				)
				.toBe(true);
		});
	}
});
