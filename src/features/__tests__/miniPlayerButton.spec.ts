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
	}

	// The button lifecycle below has no live-specific branch and the live fixture costs up to 120 s, so it runs on watch only.
	test(`mini player button should persist after navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await disableFeature(page, "miniPlayerButton.button.enabled");
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
	});

	test(`mini player button should re-appear after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		await disableFeature(page, "miniPlayerButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-miniPlayerButton-button");
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
	});

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
		// player_controls_right attachment is already asserted by clickFeatureButton in the deactivate test.
		test(`should render button in ${left}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "miniPlayerButton.button.placement", left);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", left);
		});

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "miniPlayerButton.button.placement", "feature_menu");
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-miniPlayerButton-menuitem");
		});
	});
});
