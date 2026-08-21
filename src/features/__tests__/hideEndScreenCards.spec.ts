import { test } from "playwright.config";

import { metadata } from "@/src/features/hideEndScreenCards/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideEndScreenCards: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("hideEndScreenCards", () => {
	for (const pageType of testPages) {
		test(`hides end screen cards on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`shows end screen cards when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await page.evaluate(() => {
				const video = document.querySelector("video");
				if (video) video.currentTime = Math.max(0, video.duration - 2);
			});
			await expectElementsNotHidden(page, selectors);
		});
	}
});
