import { test } from "playwright.config";

import { metadata } from "@/src/features/hidePaidPromotionBanner/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hidePaidPromotionBanner: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

test.describe("hidePaidPromotionBanner", () => {
	for (const pageType of testPages) {
		test(`shows paid promotion banner when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hidePaidPromotionBanner.enabled");
			await expectBodyWithoutClass(page, bodyClass);
		});
		test(`hides elements after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePaidPromotionBanner.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
			// A real in-page navigation, so the extension's navigation hooks run instead of a fresh document load
			// (which the reload test already covers).
			await spaNavigateToRelatedVideo(page);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`persists hide after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePaidPromotionBanner.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePaidPromotionBanner.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await disableFeature(page, "hidePaidPromotionBanner.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await enableFeature(page, "hidePaidPromotionBanner.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	test(`should not hide paid promotion banner on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hidePaidPromotionBanner.enabled");
		await expectBodyWithoutClass(page, bodyClass);
	});
});
