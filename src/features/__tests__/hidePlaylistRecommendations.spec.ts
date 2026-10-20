import { test } from "playwright.config";

import { metadata } from "@/src/features/hidePlaylistRecommendations/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import {
	navigateToPageType,
	spaNavigateBack,
	spaNavigateToHome
} from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const { watch } = pageTypeRecord;

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
		test(`should not hide playlist recommendations on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "hidePlaylistRecommendations.enabled");
			// The playlist shelves that match the hide selector do exist on watch in other contexts;
			// the body class is the feature's whole effect, so its absence is the whole assertion.
			await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
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
		test(`hides playlist recommendations after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePlaylistRecommendations.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			// In-page hops, so the includePages gate runs through the navigation manager's yt-navigate
			// listeners instead of a fresh document load: leaving the playlist must drop the class and
			// returning must bring it back through the onNavigate re-arm.
			await spaNavigateToHome(page);
			await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
			await spaNavigateBack(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
	}
});
