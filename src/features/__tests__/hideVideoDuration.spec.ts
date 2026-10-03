import { test } from "playwright.config";

import { metadata } from "@/src/features/hideVideoDuration/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideVideoDuration: { bodyClass }
} = hideFeatureSelectors;
// Live streams don't have duration overlays, so exclude live from test pages.
const testPages = resolvePageTypes(metadata.dependencies?.includePages).filter((p) => p !== "live");

test.describe("hideVideoDuration", () => {
	for (const pageType of testPages) {
		test(`adds body class when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideVideoDuration.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
		test(`does not have body class by default on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await expectBodyWithoutClass(page, bodyClass);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideVideoDuration.enabled");
			await expectBodyWithClass(page, bodyClass);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideVideoDuration.enabled");
			await expectBodyWithClass(page, bodyClass);
			await disableFeature(page, "hideVideoDuration.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await enableFeature(page, "hideVideoDuration.enabled");
			await expectBodyWithClass(page, bodyClass);
		});
	}
});
