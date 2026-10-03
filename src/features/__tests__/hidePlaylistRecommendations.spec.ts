import { test } from "playwright.config";

import { metadata } from "@/src/features/hidePlaylistRecommendations/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden
} from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hidePlaylistRecommendations: { bodyClass, selectors }
} = hideFeatureSelectors;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("hidePlaylistRecommendations", () => {
	for (const pageType of testPages) {
		test(`hides playlist recommendations on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePlaylistRecommendations.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`does not have body class by default on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await expectBodyWithoutClass(page, bodyClass);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePlaylistRecommendations.enabled");
			await expectBodyWithClass(page, bodyClass);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePlaylistRecommendations.enabled");
			await expectBodyWithClass(page, bodyClass);
			await disableFeature(page, "hidePlaylistRecommendations.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await enableFeature(page, "hidePlaylistRecommendations.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
	}
});
