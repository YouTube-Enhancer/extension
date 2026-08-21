import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/skipContinueWatching/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
interface YtdWatchElement extends Element {
	youthereDataChanged_: () => void;
}
test.describe("skipContinueWatching", () => {
	for (const pageType of testPages) {
		test(`replaces handler on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const original = await page.evaluate(() => {
				const el = document.querySelector<YtdWatchElement>("ytd-watch-grid, ytd-watch-flexy");
				return el?.youthereDataChanged_?.toString() ?? null;
			});
			await enableFeature(page, "skipContinueWatching.enabled");
			const enabled = await page.evaluate(() => {
				const el = document.querySelector<YtdWatchElement>("ytd-watch-grid, ytd-watch-flexy");
				return el?.youthereDataChanged_?.toString() ?? null;
			});
			expect(enabled).not.toBeNull();
			expect(enabled).not.toBe(original);
		});
		test(`restores handler on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const original = await page.evaluate(() => {
				const el = document.querySelector<YtdWatchElement>("ytd-watch-grid, ytd-watch-flexy");
				return el?.youthereDataChanged_?.toString() ?? null;
			});
			await enableFeature(page, "skipContinueWatching.enabled");
			await disableFeature(page, "skipContinueWatching.enabled");
			const restored = await page.evaluate(() => {
				const el = document.querySelector<YtdWatchElement>("ytd-watch-grid, ytd-watch-flexy");
				return el?.youthereDataChanged_?.toString() ?? null;
			});
			expect(restored).not.toBeNull();
			expect(restored?.toString()).toBe(original?.toString());
		});
	}
});
