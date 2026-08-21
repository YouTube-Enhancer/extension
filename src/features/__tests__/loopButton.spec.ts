import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/loopButton/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const { left, right } = placementRecord;
const { home, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
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
		test("loop should persist after navigation", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "loopButton.button.enabled");
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "loopButton.button.enabled");
			await enableFeature(page, "loopButton.button.enabled");
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
		});
		test("loop button should persist after full page reload", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "loopButton.button.enabled");
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
		});
	}

	test(`should not create loop button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "loopButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-loopButton-button");
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`should render button in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "loopButton.button.placement", placement);
				await enableFeature(page, "loopButton.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", placement);
			});
		}

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "loopButton.button.placement", "feature_menu");
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-loopButton-menuitem");
		});
	});

	test.describe("fullscreen transition", () => {
		test("should move button from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "loopButton.button.placement", left);
			await setOption(page, "loopButton.button.fullscreenPlacement", right);
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", left);
		});

		test("should not move button when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "loopButton.button.placement", right);
			await setOption(page, "loopButton.button.fullscreenPlacement", "same");
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", right);
		});
	});
});
