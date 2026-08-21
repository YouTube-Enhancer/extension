import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/loopButton/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const { left } = placementRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
test.describe("loopButton", () => {
	for (const pageType of testPages) {
		test("loop button should be enabled", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "loopButton.button.placement", left);
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
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-loopButton-button", left);
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
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			// Enable loop
			await clickFeatureButton(page, pageType, "yte-feature-loopButton-button", left);
			await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", true);
			// Disable loop
			await clickFeatureButton(page, pageType, "yte-feature-loopButton-button", left);
			await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", false);
		});
	}
});
