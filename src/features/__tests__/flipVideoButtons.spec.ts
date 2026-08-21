import { test } from "playwright.config";

import { metadata } from "@/src/features/flipVideoButtons/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { right } = placementRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("flipVideoButtons", () => {
	for (const pageType of testPages) {
		test.describe("flipVideoHorizontalButton", () => {
			test(`horizontal flip button should be present on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
				await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
			});
			test(`horizontal flip button should not be present when disabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await disableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
				await expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoHorizontalButton-button");
			});
		});
		test.describe("flipVideoVerticalButton", () => {
			test(`vertical flip button should be present on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
				await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
			});
			test(`vertical flip button should not be present when disabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await disableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
				await expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoVerticalButton-button");
			});
		});
	}
});
