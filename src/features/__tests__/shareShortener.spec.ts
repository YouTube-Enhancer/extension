import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/shareShortener/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToFirstVideo } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// A live stream is a /watch document and neither index.ts nor utils.ts has a live/VOD branch, so the live case
// duplicates watch while raising the test budget to 120 s and burning a channel crawl.
const pageTypes = resolvePageTypes(metadata.dependencies?.includePages).filter((pageType) => pageType !== "live");
const { search, watch } = pageTypeRecord;

// YouTube leaves a closed share dialog's input in the DOM, so a bare `#share-url` matches more than one
// element once a second dialog has been opened; the visible one is the dialog that is on screen.
const SHARE_URL_SELECTOR = "#share-url:visible";
const SHARE_PARAM_REGEXP = /(\?|&)(si|feature|pp)=[^&]*/;
const SHARE_URL_REGEXP = /^https:\/\/(youtu\.be|(www\.)?youtube\.com)\//;

/** The panel on screen has to be closed before another one can be opened for a fresh URL. */
async function closeShareDialog(page: Page): Promise<void> {
	await page.keyboard.press("Escape");
	await expect(page.locator(SHARE_URL_SELECTOR)).toBeHidden({ timeout: 10000 });
}
/** How many rendered result links still carry a tracking param; `cleanSearchPage` has to take this to 0. */
async function countTrackedResultLinks(page: Page): Promise<number> {
	const hrefs = await page.evaluate(() =>
		Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/watch?v="]')).map((anchor) => anchor.getAttribute("href") ?? "")
	);
	return hrefs.filter((href) => SHARE_PARAM_REGEXP.test(href)).length;
}
/**
 * An empty or not-yet-populated `#share-url` already satisfies `.not.toMatch(SHARE_PARAM_REGEXP)`, so the
 * field has to hold a real share URL before the absence of the params means anything.
 */
async function expectShareUrlWithoutParams(page: Page): Promise<void> {
	await expect.poll(async () => getShareUrl(page), { timeout: 10000 }).toMatch(SHARE_URL_REGEXP);
	await expect.poll(async () => getShareUrl(page), { timeout: 10000 }).not.toMatch(SHARE_PARAM_REGEXP);
}
async function getShareUrl(page: Page): Promise<string> {
	return await page.locator(SHARE_URL_SELECTOR).inputValue();
}

/** `index` picks which search result's action menu to open; the other pages only ever have one share button. */
async function openShareDialog(page: Page, pageType: string, index = 0): Promise<void> {
	switch (pageType) {
		case "search": {
			const videoRenderer = page.locator("ytd-video-renderer").nth(index);
			await videoRenderer.locator('button[aria-label="Action menu"]').click();
			await page.getByRole("menuitem", { name: "Share" }).first().click();
			break;
		}
		case "shorts": {
			await page.getByRole("button", { name: "Share" }).first().click();
			break;
		}
		default: {
			await page.getByRole("button", { name: "Share" }).first().click();
		}
	}
	await expect(page.locator(SHARE_URL_SELECTOR)).toBeVisible({ timeout: 10000 });
}

test.describe("shareShortener", () => {
	for (const pageType of pageTypes) {
		test(`should remove share params when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shareShortener.enabled");
			await openShareDialog(page, pageType);
			await expectShareUrlWithoutParams(page);
		});
		test(`should preserve share params when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "shareShortener.enabled");
			await openShareDialog(page, pageType);
			await expect.poll(async () => await getShareUrl(page)).toMatch(SHARE_PARAM_REGEXP);
		});
	}
	// The lifecycle cases below only run removeObserver + setupShareShortener, which have no page-specific code
	// path, so they run on watch only; the per-page dialog behaviour is covered by the two tests above.
	test(`re-applies after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "shareShortener.enabled");
		await openShareDialog(page, watch);
		await expectShareUrlWithoutParams(page);
		await closeShareDialog(page);
		await disableFeature(page, "shareShortener.enabled");
		await enableFeature(page, "shareShortener.enabled");
		await openShareDialog(page, watch);
		await expectShareUrlWithoutParams(page);
	});
	test(`persists after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "shareShortener.enabled");
		await openShareDialog(page, watch);
		await expectShareUrlWithoutParams(page);
		await reloadPage(page, watch);
		await openShareDialog(page, watch);
		await expectShareUrlWithoutParams(page);
	});
	// cleanSearchPage only runs on /results, and it is the one branch of the feature that never touches the
	// share dialog.
	test(`should strip tracking params from search result links when enabled on ${search}`, async ({ page }) => {
		await navigateToPageType(page, search);
		await disableFeature(page, "shareShortener.enabled");
		// The rewrite runs over the links that exist when the feature is enabled, so tracked links have to be
		// there first - otherwise "no tracked links" would be true before the feature ever ran.
		await expect.poll(async () => countTrackedResultLinks(page), { timeout: 15000 }).toBeGreaterThan(0);
		await enableFeature(page, "shareShortener.enabled");
		await expect.poll(async () => countTrackedResultLinks(page), { timeout: 15000 }).toBe(0);
	});
	test(`should keep the share URL clean when the dialog is opened for a second video on ${search}`, async ({ page }) => {
		await navigateToPageType(page, search);
		await enableFeature(page, "shareShortener.enabled");
		await openShareDialog(page, search);
		await expectShareUrlWithoutParams(page);
		const firstShareUrl = await getShareUrl(page);
		await closeShareDialog(page);
		// The MutationObserver disconnects after its first hit, so every later dialog depends on the polling
		// interval alone - and the dialog it has to clean is a different input element each time.
		await openShareDialog(page, search, 1);
		await expect.poll(async () => getShareUrl(page), { timeout: 10000 }).not.toBe(firstShareUrl);
		await expectShareUrlWithoutParams(page);
	});
	test(`should clean the share URL after in-page navigation from ${search} to ${watch}`, async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, search);
		await enableFeature(page, "shareShortener.enabled");
		// A genuine in-document navigation, which is the only path that runs onNavigate; every other
		// navigation in this spec is a document load that re-runs onEnable.
		await spaNavigateToFirstVideo(page);
		await openShareDialog(page, watch);
		await expectShareUrlWithoutParams(page);
	});
	test(`restores share params when disabled after being enabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "shareShortener.enabled");
		await openShareDialog(page, watch);
		await expectShareUrlWithoutParams(page);
		// The panel is reused, so it has to be closed and reopened for YouTube to regenerate the URL.
		await closeShareDialog(page);
		await disableFeature(page, "shareShortener.enabled");
		await openShareDialog(page, watch);
		await expect.poll(async () => getShareUrl(page), { timeout: 10000 }).toMatch(SHARE_PARAM_REGEXP);
	});
});
