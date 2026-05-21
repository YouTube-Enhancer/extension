import { expect, test } from "playwright.config";

import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const testPages = ["watch", "live"] as const;
const placement = "player_controls_left" as const;
test.describe("maximizePlayerButton", () => {
	for (const pageType of testPages) {
		test(`maximize player button should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await setOption(page, "maximizePlayerButton.button.placement", placement);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		});
		test(`maximize player button should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-maximizePlayerButton-button");
		});
		test(`player should be maximized on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await setOption(page, "maximizePlayerButton.button.placement", placement);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-maximizePlayerButton-button", placement);
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
