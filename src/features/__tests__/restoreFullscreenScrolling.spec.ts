import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/restoreFullscreenScrolling/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, watch } = pageTypeRecord;
// Every rule in index.css is scoped to `[fullscreen]`, so the classes only mean something while the page is
// actually in fullscreen.
const APP_SELECTOR = "ytd-app";
const COLUMNS_SELECTOR = "#columns.ytd-watch-flexy";

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

	// Watch only: the CSS is keyed on ytd-watch-flexy/ytd-app, which the live fixture shares, and entering
	// fullscreen on a live stream would only re-measure the same two rules for a 120 s channel crawl.
	test(`restores page scrolling while in fullscreen on ${watch}`, async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch);
		await enableFeature(page, "restoreFullscreenScrolling.enabled");
		await expect(page.locator(APP_SELECTOR)).toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
		await toggleFullscreen(page, true);
		// The class strings are inert outside fullscreen; these two declarations are the whole feature.
		await expect(page.locator(APP_SELECTOR)).toHaveCSS("overflow-y", "auto");
		await expect(page.locator(COLUMNS_SELECTOR)).toHaveCSS("display", "flex");
		// Disabled in place, still in fullscreen: YouTube's own fullscreen rules have to take the page back.
		await disableFeature(page, "restoreFullscreenScrolling.enabled");
		await expect(page.locator(APP_SELECTOR)).not.toHaveCSS("overflow-y", "auto");
		await expect(page.locator(COLUMNS_SELECTOR)).not.toHaveCSS("display", "flex");
		await toggleFullscreen(page, false);
	});

	test(`should not add restore fullscreen scrolling classes on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "restoreFullscreenScrolling.enabled");
		// ytd-watch-flexy does not exist on the non-target fixture, and not.toHaveClass on a missing element
		// fails rather than passing - toHaveCount(0) is the assertion that actually expresses "never marked".
		await expect(page.locator("ytd-watch-flexy.yte-ytd-watch-flexy-restore-fullscreen-scrolling")).toHaveCount(0);
		await expect(page.locator("ytd-app")).not.toHaveClass(/yte-ytd-app-restore-fullscreen-scrolling/);
	});
});
