import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/shareShortener/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const pageTypes = resolvePageTypes(metadata.dependencies?.includePages);

const SHARE_URL_SELECTOR = "#share-url";
const SHARE_PARAM_REGEXP = /(\?|&)(si|feature|pp)=[^&]*/;

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
	await expect(page.locator(SHARE_URL_SELECTOR)).toBeVisible();
}

test.describe("shareShortener", () => {
	for (const pageType of pageTypes) {
		test(`should remove share params when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "shareShortener.enabled");
			await openShareDialog(page, pageType);
			await expect.poll(async () => await getShareUrl(page)).not.toMatch(SHARE_PARAM_REGEXP);
		});
		test(`should preserve share params when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "shareShortener.enabled");
			await openShareDialog(page, pageType);
			await expect.poll(async () => await getShareUrl(page)).toMatch(SHARE_PARAM_REGEXP);
		});
	}
});
