import { expect, test } from "playwright.config";

import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
const placement = "player_controls_left";
const pageType = "watch";
test.describe("loopButton", () => {
	test("loop button should be enabled", async ({ page }) => {
		await navigateToPageType(page, pageType);
		await setOption(page, "loopButton.button.placement", placement);
		await enableFeature(page, "loopButton.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
	});
	test("loop button should be disabled", async ({ page }) => {
		await navigateToPageType(page, pageType);
		await disableFeature(page, "loopButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-loopButton-button");
	});
	test("loop should be enabled when clicking the loop button", async ({ page }) => {
		await navigateToPageType(page, pageType);
		await enableFeature(page, "loopButton.button.enabled");
		await setOption(page, "loopButton.button.placement", placement);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
		await clickFeatureButton(page, pageType, "yte-feature-loopButton-button", placement);
		await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", true);
	});
	test("loop should be disabled when disabled", async ({ page }) => {
		await navigateToPageType(page, pageType);
		await disableFeature(page, "loopButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-loopButton-button");
		await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", false);
	});
	test("loop should toggle off when clicking the loop button again", async ({ page }) => {
		await navigateToPageType(page, pageType);
		await enableFeature(page, "loopButton.button.enabled");
		await setOption(page, "loopButton.button.placement", placement);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
		// Enable loop
		await clickFeatureButton(page, pageType, "yte-feature-loopButton-button", placement);
		await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", true);
		// Disable loop
		await clickFeatureButton(page, pageType, "yte-feature-loopButton-button", placement);
		await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", false);
	});
});
