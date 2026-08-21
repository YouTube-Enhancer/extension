import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/monoToStereo/index.metadata";
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

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { left, right } = placementRecord;
const { home, watch } = pageTypeRecord;

async function isMonoEnabled(page: Page): Promise<boolean> {
	return await page.evaluate(() => !!window.engine?.monoEnabled);
}

test.describe("monoToStereoButton", () => {
	for (const pageType of testPages) {
		test(`button should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
			await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy();
		});
		test(`button should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await disableFeature(page, "monoToStereoButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
		});
		test(`audio should switch to stereo on click on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-monoToStereoButton-button", right);
			await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		});
		test(`audio should toggle back to mono on second click on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await clickFeatureButton(page, pageType, "yte-feature-monoToStereoButton-button", right);
			await clickFeatureButton(page, pageType, "yte-feature-monoToStereoButton-button", right);
			await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy();
		});
		test(`button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
		});
		test(`button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
			await disableFeature(page, "monoToStereoButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
		});
	}

	test(`button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0], ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0], ["monoAudio"]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
	});

	test(`should not create mono to stereo button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`should render button in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "monoToStereoButton.button.placement", placement);
				await enableFeature(page, "monoToStereoButton.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", placement);
			});
		}

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "monoToStereoButton.button.placement", "feature_menu");
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-monoToStereoButton-menuitem");
		});
	});

	test.describe("fullscreen transition", () => {
		test("should move button from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "monoToStereoButton.button.placement", left);
			await setOption(page, "monoToStereoButton.button.fullscreenPlacement", right);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", left);
		});

		test("should not move button when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "monoToStereoButton.button.placement", right);
			await setOption(page, "monoToStereoButton.button.fullscreenPlacement", "same");
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", right);
		});
	});
});
