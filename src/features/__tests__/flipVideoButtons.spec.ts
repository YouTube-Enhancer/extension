import { test } from "playwright.config";

import { metadata } from "@/src/features/flipVideoButtons/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeIn, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { left, right } = placementRecord;
const { home, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

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
		test(`horizontal flip button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
		});
		test(`vertical flip button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
		});
		test(`horizontal flip button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
			await disableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoHorizontalButton-button");
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
		});
		test(`vertical flip button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
			await disableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoVerticalButton-button");
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
		});
	}

	test(`horizontal flip button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
	});

	test(`vertical flip button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
	});

	test(`should not create flip video buttons on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoHorizontalButton-button");
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`horizontal flip button should render in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", placement);
				await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", placement);
			});
			test(`vertical flip button should render in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", placement);
				await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", placement);
			});
		}
	});

	test.describe("fullscreen transition", () => {
		test("horizontal flip button should move from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", left);
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.fullscreenPlacement", right);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", left);
		});

		test("vertical flip button should move from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", left);
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.fullscreenPlacement", right);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", left);
		});

		test("horizontal flip button should not move when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.fullscreenPlacement", "same");
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", right);
		});

		test("vertical flip button should not move when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.fullscreenPlacement", "same");
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", right);
		});
	});
});
