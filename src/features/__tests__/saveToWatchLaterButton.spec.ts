import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/saveToWatchLaterButton/index.metadata";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

const BUTTON_SELECTOR = ".yte-save-to-watch-later-button";

test.describe("saveToWatchLaterButton", () => {
	for (const pageType of testPages) {
		test(`toggling feature should not crash the page on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await page.waitForTimeout(1000);
			await expect(page.locator("body")).toBeAttached();
			await disableFeature(page, "saveToWatchLaterButton.enabled");
			await page.waitForTimeout(500);
			await expect(page.locator("body")).toBeAttached();
		});

		test(`save button should appear when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});

		test(`save button should be removed when disabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			await disableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR)).not.toBeAttached();
		});

		test(`save button should persist after navigation when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			await navigateToPageType(page, pageType);
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});

		test(`save button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			await disableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR)).not.toBeAttached();
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});

		test(`save button should persist after full page reload on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});
	}

	test(`should not create save button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "saveToWatchLaterButton.enabled");
		await expect(page.locator(BUTTON_SELECTOR)).not.toBeAttached();
	});
});
