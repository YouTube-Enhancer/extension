import { expect, test } from "playwright.config";

import type { FeatureButtonId } from "@/src/types";

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
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
			await clickFeatureButton(page, "yte-feature-maximizePlayerButton-button", placement);
			const isMaximized = await page.evaluate(() => {
				return document.body.hasAttribute("yte-maximized");
			});
			expect(isMaximized).toBeTruthy();
			expect(isMaximized).toBe(true);
		});
		test(`player shouldn't be maximized on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "maximizePlayerButton.button.enabled");
			await setOption(page, "maximizePlayerButton.button.placement", placement);
			const maximizePlayerButton = page.locator(`#yte-feature-maximizePlayerButton-button` satisfies `#${FeatureButtonId}`);
			await expect(maximizePlayerButton).not.toBeAttached();
			const isMaximized = await page.evaluate(() => {
				return document.body.hasAttribute("yte-maximized");
			});
			expect(isMaximized).toBeFalsy();
		});
	}
});
