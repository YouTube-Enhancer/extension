import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/hideArtificialIntelligence/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";
import { loginRequiredPages, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideArtificialIntelligence: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { home, watch } = pageTypeRecord;

/**
 * Computed `display` of every element matching the feature selectors, in document order. Used as a baseline so the
 * disabled state can be compared against how the page looked before the feature ever ran, instead of assuming the
 * matched elements are visible (YouTube hides plenty of them for its own reasons).
 */
async function getSelectorDisplays(page: Page): Promise<string[]> {
	return page.evaluate(
		(list) =>
			list.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector), (element) => getComputedStyle(element).display)),
		[...selectors]
	);
}

test.describe("hideArtificialIntelligence", () => {
	for (const pageType of testPages) {
		test(`hides AI elements on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideArtificialIntelligence.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	// onEnable/onDisable only add/remove a body class and there is no onNavigate hook or page-specific branch,
	// so the navigation, reload and toggle cycles are exercised on watch only instead of on all 11 pages.
	test("hides elements after navigation on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});
	test("persists hide after full page reload on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await reloadPage(page, watch);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});
	test("re-applies after disable then re-enable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		const baselineDisplays = await getSelectorDisplays(page);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await disableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expect.poll(() => getSelectorDisplays(page)).toEqual(baselineDisplays);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
	});
});
