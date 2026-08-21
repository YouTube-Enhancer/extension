import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/openTranscriptButton/index.metadata";
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
test.describe("openTranscriptButton", () => {
	for (const pageType of testPages) {
		test("open transcript button should be enabled", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		});
		test("open transcript button should be disabled", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeFalsy(page, "yte-feature-openTranscriptButton-button");
		});
		test("transcript should be shown when clicking the transcript button", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-openTranscriptButton-button", left);
			await expect(page.locator("ytd-engagement-panel-section-list-renderer[target-id=PAmodern_transcript_view]")).toHaveAttribute(
				"visibility",
				"ENGAGEMENT_PANEL_VISIBILITY_EXPANDED",
				{ timeout: 10000 }
			);
		});
		test("transcript should not be shown when disabled", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "openTranscriptButton.button.enabled");
			await expect(page.locator("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]")).toHaveAttribute(
				"visibility",
				"ENGAGEMENT_PANEL_VISIBILITY_HIDDEN"
			);
		});
		test("transcript button should persist after navigation", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		});
		test("transcript button should re-appear after disable then re-enable", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
			await disableFeature(page, "openTranscriptButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-openTranscriptButton-button");
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		});
	}

	test("transcript button should persist after full page reload", async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "openTranscriptButton.button.enabled");
		await setOption(page, "openTranscriptButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
	});

	test(`should not create transcript button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "openTranscriptButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-openTranscriptButton-button");
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`should render button in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "openTranscriptButton.button.placement", placement);
				await enableFeature(page, "openTranscriptButton.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-openTranscriptButton-button", placement);
			});
		}

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "openTranscriptButton.button.placement", "feature_menu");
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-openTranscriptButton-menuitem");
		});
	});

	test.describe("fullscreen transition", () => {
		test("should move button from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "openTranscriptButton.button.placement", left);
			await setOption(page, "openTranscriptButton.button.fullscreenPlacement", right);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-openTranscriptButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-openTranscriptButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-openTranscriptButton-button", left);
		});

		test("should not move button when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "openTranscriptButton.button.placement", right);
			await setOption(page, "openTranscriptButton.button.fullscreenPlacement", "same");
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-openTranscriptButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-openTranscriptButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-openTranscriptButton-button", right);
		});
	});
});
