import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/hideEndScreenCardsButton/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
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
		test(`button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await setOption(page, "hideEndScreenCardsButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await setOption(page, "hideEndScreenCardsButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
		});
		test(`button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await setOption(page, "hideEndScreenCardsButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
			await disableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-hideEndScreenCardsButton-button");
			await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await setOption(page, "hideEndScreenCardsButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
		});
	}

	test(`button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
		await setOption(page, "hideEndScreenCardsButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
	});

	test(`should not create button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-hideEndScreenCardsButton-button");
	});

	test.describe("feature conflicts", () => {
		test.describe("hideEndScreenCardsButton → hideEndScreenCards", () => {
			test("hideEndScreenCards state persists after navigation with button active on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
				await setOption(page, "hideEndScreenCardsButton.button.placement", right);
				await page.locator("#yte-feature-hideEndScreenCardsButton-button").click();
				await expect(page.locator("body")).toHaveClass(/yte-hide-end-screen-cards/);

				await navigateToPageType(page, home);
				await page.waitForTimeout(500);
				await navigateToPageType(page, watch);
				await page.waitForTimeout(2000);

				await expect(page.locator("body")).not.toHaveClass(/yte-hide-end-screen-cards/);
			});
		});
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`should render button in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "hideEndScreenCardsButton.button.placement", placement);
				await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-hideEndScreenCardsButton-button", placement);
			});
		}

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "hideEndScreenCardsButton.button.placement", "feature_menu");
			await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-menuitem");
		});
	});

	test.describe("fullscreen transition", () => {
		test("should move button from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "hideEndScreenCardsButton.button.placement", left);
			await setOption(page, "hideEndScreenCardsButton.button.fullscreenPlacement", right);
			await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-hideEndScreenCardsButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-hideEndScreenCardsButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-hideEndScreenCardsButton-button", left);
		});

		test("should not move button when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "hideEndScreenCardsButton.button.placement", right);
			await setOption(page, "hideEndScreenCardsButton.button.fullscreenPlacement", "same");
			await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-hideEndScreenCardsButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-hideEndScreenCardsButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-hideEndScreenCardsButton-button", right);
		});
	});
});
