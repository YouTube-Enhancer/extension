import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/saveToWatchLaterButton/index.metadata";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

const BUTTON_SELECTOR = ".yte-save-to-watch-later-button";
const ACTIONS_ROW_BUTTON_SELECTOR = `ytd-watch-metadata ytd-menu-renderer ${BUTTON_SELECTOR}`;
const { home, watch } = pageTypeRecord;

test.describe("saveToWatchLaterButton", () => {
	for (const pageType of testPages) {
		test(`save button should appear when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
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
	}

	// The load-time path branches only on `onWatchPage`; subscriptions only repeats the home page-type interpolation.
	for (const pageType of [home, watch] as const) {
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
	test.describe("watch page actions row", () => {
		test("renders a native toggle button in the actions row", async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, watch);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			const actionsRowButton = page.locator(ACTIONS_ROW_BUTTON_SELECTOR);
			await expect(actionsRowButton).toBeAttached({ timeout: 10000 });
			// The button is built from YouTube's own component so it inherits the native look and tooltip handling.
			expect(await actionsRowButton.evaluate((el) => el.tagName.toLowerCase())).toBe("yt-button-view-model");
			await expect(actionsRowButton.locator("button")).toBeAttached({ timeout: 10000 });
		});
	});
});
