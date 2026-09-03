import { test } from "playwright.config";

import { metadata } from "@/src/features/hideEndScreenCardsButton/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { right } = placementRecord;
const { home, watch } = pageTypeRecord;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

test.describe("hideEndScreenCardsButton", () => {
	for (const pageType of testPages) {
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
			test("hideEndScreenCards toggled by the button resets after navigation on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
				await setOption(page, "hideEndScreenCardsButton.button.placement", right);
				await clickFeatureButton(page, watch, "yte-feature-hideEndScreenCardsButton-button", right);
				await expectBodyWithClass(page, "yte-hide-end-screen-cards");

				await navigateToPageType(page, home);
				await navigateToPageType(page, watch);
				// The button toggle is not written back to storage, so waiting for the re-added button is enough to prove the class is not restored.
				await expectFeatureButtonToBeIn(page, "yte-feature-hideEndScreenCardsButton-button", right);
				await expectBodyWithoutClass(page, "yte-hide-end-screen-cards");
			});
		});
	});

	test.describe("button placement", () => {
		// Nothing in the feature branches on left vs right, and generic left/right/below placement is covered by buttonController, so only right is exercised here.
		for (const placement of [right] as const) {
			test(`should render button in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "hideEndScreenCardsButton.button.placement", placement);
				await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-hideEndScreenCardsButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-hideEndScreenCardsButton-button", placement);
			});
		}
	});
});
