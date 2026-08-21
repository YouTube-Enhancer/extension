import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/maximizePlayerButton/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { left } = placementRecord;
test.describe("maximizePlayerButton", () => {
	for (const pageType of testPages) {
		test(`maximize player button should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		});
		test(`maximize player button should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-maximizePlayerButton-button");
		});
		test(`player should be maximized on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-maximizePlayerButton-button", left);
			await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		});
		test(`player shouldn't be maximized on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-maximizePlayerButton-button");
			await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		});
	}
});
