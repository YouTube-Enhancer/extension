import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/shareShortener/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// A live stream is a /watch document and neither index.ts nor utils.ts has a live/VOD branch, so the live case
// duplicates watch while raising the test budget to 120 s and burning a channel crawl.
const pageTypes = resolvePageTypes(metadata.dependencies?.includePages).filter((pageType) => pageType !== "live");
const { watch } = pageTypeRecord;

const SHARE_URL_SELECTOR = "#share-url";
const SHARE_PARAM_REGEXP = /(\?|&)(si|feature|pp)=[^&]*/;
const SHARE_URL_REGEXP = /^https:\/\/(youtu\.be|(www\.)?youtube\.com)\//;

/** The share panel is reused, so it has to be closed before it can be reopened for a fresh URL. */
async function closeShareDialog(page: Page): Promise<void> {
	await page.keyboard.press("Escape");
	await expect(page.locator(SHARE_URL_SELECTOR)).toBeHidden({ timeout: 10000 });
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

async function openShareDialog(page: Page, pageType: string): Promise<void> {
	switch (pageType) {
		case "search": {
			const videoRenderer = page.locator("ytd-video-renderer").first();
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
