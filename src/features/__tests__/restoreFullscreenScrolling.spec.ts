import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/restoreFullscreenScrolling/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home } = pageTypeRecord;

test.describe("restoreFullscreenScrolling", () => {
	for (const pageType of testPages) {
		test(`should restore fullscreen scrolling classes after navigation on ${pageType}`, async ({ page }) => {
			test.setTimeout(120_000);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "restoreFullscreenScrolling.enabled");
			await expect(page.locator("ytd-watch-flexy")).toHaveClass(/yte-ytd-watch-flexy-restore-fullscreen-scrolling/);
			await expect(page.locator("ytd-app")).toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			// No disable/enable round trip: the assertions have to observe the state the navigation produced.
			await expect(page.locator("ytd-watch-flexy")).toHaveClass(/yte-ytd-watch-flexy-restore-fullscreen-scrolling/);
			await expect(page.locator("ytd-app")).toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "restoreFullscreenScrolling.enabled");
			await expect(page.locator("ytd-watch-flexy")).toHaveClass(/yte-ytd-watch-flexy-restore-fullscreen-scrolling/);
			await expect(page.locator("ytd-app")).toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
			await disableFeature(page, "restoreFullscreenScrolling.enabled");
			await expect(page.locator("ytd-watch-flexy")).not.toHaveClass(/yte-ytd-watch-flexy-restore-fullscreen-scrolling/);
			await expect(page.locator("ytd-app")).not.toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
			await enableFeature(page, "restoreFullscreenScrolling.enabled");
			await expect(page.locator("ytd-watch-flexy")).toHaveClass(/yte-ytd-watch-flexy-restore-fullscreen-scrolling/);
			await expect(page.locator("ytd-app")).toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
		});
	}

	test(`should not add restore fullscreen scrolling classes on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "restoreFullscreenScrolling.enabled");
		// ytd-watch-flexy does not exist on the non-target fixture, and not.toHaveClass on a missing element
		// fails rather than passing - toHaveCount(0) is the assertion that actually expresses "never marked".
		await expect(page.locator("ytd-watch-flexy.yte-ytd-watch-flexy-restore-fullscreen-scrolling")).toHaveCount(0);
		await expect(page.locator("ytd-app")).not.toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
	});
});
