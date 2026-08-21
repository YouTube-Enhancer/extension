import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/miniPlayerButton/index.metadata";
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
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, watch } = pageTypeRecord;

test.describe("miniPlayerButton", () => {
	for (const pageType of testPages) {
		test(`mini player button should be present on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		});
		test(`mini player button should not be present when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-miniPlayerButton-button");
		});
		test(`clicking mini player button should activate mini player on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-miniPlayerButton-button", right);
			await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		});
		test(`clicking mini player button again should deactivate mini player on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-miniPlayerButton-button", right);
			await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
			await clickFeatureButton(page, pageType, "yte-feature-miniPlayerButton-button", right);
			await expect(page.locator("html")).not.toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		});
		test(`mini player button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "miniPlayerButton.button.enabled");
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		});
		test(`mini player button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
			await disableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-miniPlayerButton-button");
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		});
	}

	test(`mini player button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
	});

	test(`should not create mini player button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-miniPlayerButton-button");
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`should render button in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "miniPlayerButton.button.placement", placement);
				await enableFeature(page, "miniPlayerButton.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", placement);
			});
		}

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "miniPlayerButton.button.placement", "feature_menu");
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-miniPlayerButton-menuitem");
		});
	});

	test.describe("fullscreen transition", () => {
		test("should move button from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "miniPlayerButton.button.placement", left);
			await setOption(page, "miniPlayerButton.button.fullscreenPlacement", right);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", left);
		});

		test("should not move button when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "miniPlayerButton.button.placement", right);
			await setOption(page, "miniPlayerButton.button.fullscreenPlacement", "same");
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", right);
		});
	});
});
