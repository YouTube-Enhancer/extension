import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateBack, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { loginRequiredPages } from "@/src/utils/_tests/utils";

// The feature has no page-specific branch; an explicit page set avoids running every test on all 11 page types.
const testPages: PageType[] = ["watch"];
const { home, watch } = pageTypeRecord;

const overflowSpacerId = "yte-test-overflow-spacer";
const hideScrollBarStyleId = "yte-hide-scroll-bar";

async function expectScrollbarHidden(page: Page): Promise<void> {
	await expect(page.locator(`#${hideScrollBarStyleId}`)).toBeAttached();
	await expect.poll(() => page.evaluate(() => document.documentElement.clientWidth >= window.innerWidth), { timeout: 10000 }).toBe(true);
}
async function expectScrollbarVisible(page: Page): Promise<void> {
	await expect(page.locator(`#${hideScrollBarStyleId}`)).not.toBeAttached();
	await expect.poll(() => page.evaluate(() => document.documentElement.clientWidth >= window.innerWidth), { timeout: 10000 }).toBe(false);
}
/**
 * Guarantees the document overflows vertically. Without overflow `clientWidth >= innerWidth` is trivially true,
 * so the scrollbar assertions would pass even with the feature completely broken.
 */
async function forceOverflow(page: Page): Promise<void> {
	await page.evaluate((id) => {
		if (document.getElementById(id)) return;
		const spacer = document.createElement("div");
		spacer.id = id;
		spacer.style.height = "10000px";
		spacer.style.width = "1px";
		document.body.appendChild(spacer);
	}, overflowSpacerId);
	await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight), { timeout: 10000 }).toBe(true);
}

test.describe("hideScrollBar", () => {
	for (const pageType of testPages) {
		test(`scrollbar should be hidden on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await forceOverflow(page);
			await enableFeature(page, "hideScrollBar.enabled");
			await expectScrollbarHidden(page);
		});
		test(`does not hide the scrollbar by default on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await forceOverflow(page);
			await expectScrollbarVisible(page);
		});
		test(`persists scrollbar hide after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await forceOverflow(page);
			await enableFeature(page, "hideScrollBar.enabled");
			await expectScrollbarHidden(page);
			await reloadPage(page, pageType);
			await forceOverflow(page);
			await expectScrollbarHidden(page);
		});
		test(`re-applies scrollbar hide after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await forceOverflow(page);
			await enableFeature(page, "hideScrollBar.enabled");
			await expectScrollbarHidden(page);
			await disableFeature(page, "hideScrollBar.enabled");
			await expectScrollbarVisible(page);
			await enableFeature(page, "hideScrollBar.enabled");
			await expectScrollbarHidden(page);
		});
	}

	test(`keeps the scrollbar hidden across SPA navigation on ${watch}`, async ({ page }) => {
		test.skip(!hasAuthState() && loginRequiredPages.includes(home), `the in-page hop lands on ${home}, which requires login`);
		await navigateToPageType(page, watch);
		await forceOverflow(page);
		await enableFeature(page, "hideScrollBar.enabled");
		await expectScrollbarHidden(page);
		// The feature declares no includePages, so the in-page navigation hooks must leave it enabled on both hops.
		await spaNavigateToHome(page);
		await forceOverflow(page);
		await expectScrollbarHidden(page);
		await spaNavigateBack(page, "watch");
		await forceOverflow(page);
		await expectScrollbarHidden(page);
	});
});
