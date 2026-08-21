import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/miniPlayerButton/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { right } = placementRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

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
	}
});
