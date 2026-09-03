import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/remainingTime/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home } = pageTypeRecord;
// The insertion point the feature actually uses (index.ts:56, 71).
const REMAINING_TIME_SELECTOR = ".ytp-time-display > .ytp-time-wrapper > .ytp-time-contents > span#ytp-time-remaining";
// ` (-M:SS)`, ` (-H:MM:SS)` or ` (-<seconds>)`; a zero remaining time would mean the arithmetic is broken.
const REMAINING_TIME_TEXT = /^ \(-(\d+(:\d{2}){1,3}|[1-9]\d*)\)$/;

test.describe("remainingTime", () => {
	for (const pageType of testPages) {
		test(`remaining time should be displayed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "remainingTime.enabled");
			const remainingTimeElement = page.locator(REMAINING_TIME_SELECTOR);
			await expect(remainingTimeElement).toBeAttached();
			// textContent, not toHaveText: the latter normalizes whitespace and would drop the leading space.
			await expect.poll(async () => remainingTimeElement.textContent(), { timeout: 10000 }).toMatch(REMAINING_TIME_TEXT);
		});
		test(`remaining time shouldn't be displayed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "remainingTime.enabled");
			const remainingTimeElement = page.locator("span#ytp-time-remaining");
			await expect(remainingTimeElement).not.toBeAttached();
		});
		test(`remaining time should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "remainingTime.enabled");
			await expect(page.locator("span#ytp-time-remaining")).toBeAttached();
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			// No disable/enable round trip: the assertion has to observe what the navigation produced.
			await expect(page.locator("span#ytp-time-remaining")).toBeAttached({ timeout: 10000 });
		});
	}

	test(`should not display remaining time on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "remainingTime.enabled");
		await expect(page.locator("span#ytp-time-remaining")).not.toBeAttached();
	});
});
