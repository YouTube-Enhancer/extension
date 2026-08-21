import { test } from "playwright.config";

import { metadata } from "@/src/features/hideEndScreenCardsButton/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeTruthy
} from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { right } = placementRecord;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("hideEndScreenCardsButton", () => {
	for (const pageType of testPages) {
		test(`button should be present on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await setOption(page, "hideEndScreenCardsButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
		});
		test(`button toggles hideEndScreenCards on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await setOption(page, "hideEndScreenCardsButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-hideEndScreenCardsButton-button", right);
			await expectBodyWithClass(page, "yte-hide-end-screen-cards");
			await clickFeatureButton(page, pageType, "yte-feature-hideEndScreenCardsButton-button", right);
			await expectBodyWithoutClass(page, "yte-hide-end-screen-cards");
		});
		test(`button should be disabled when feature is off on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-hideEndScreenCardsButton-button");
		});
	}
});
