import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/hideScrollBar/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { home } = pageTypeRecord;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("hideScrollBar", () => {
	for (const pageType of testPages) {
		if (pageType === "shorts") {
			test.skip(`scrollbar tests are not applicable on shorts`, async () => {});
			continue;
		}
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
		test(`scrollbar should stay hidden after navigation on ${pageType}`, async ({ page }) => {
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
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hideScrollBar.enabled");
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
		test(`restores scrollbar when disabled after being enabled on ${pageType}`, async ({ page }) => {
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
		test(`dynamically added content keeps scrollbar hidden on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideScrollBar.enabled");
			await page.waitForTimeout(1000);
			await page.evaluate(() => {
				const el = document.createElement("div");
				el.style.height = "10000px";
				document.body.appendChild(el);
			});
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
