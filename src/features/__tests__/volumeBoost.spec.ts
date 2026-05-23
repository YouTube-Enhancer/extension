import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/volumeBoost/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
import { clampDb, dbToLinear } from "@/src/utils/misc";
const { right } = placementRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

async function expectVolumeBoostAmount(page: Page, expected: number) {
	await expect
		.poll(
			async () =>
				page.evaluate(() => {
					const gain = window.engine?.volumeGain?.gain;
					if (!gain) return null;
					return gain.value;
				}),
			{ timeout: 10_000 }
		)
		.toBeCloseTo(dbToLinear(clampDb(expected)), 5);
}
async function expectVolumeBoostEnabled(page: Page, enabled: boolean) {
	await expect
		.poll(
			async () =>
				page.evaluate(() => {
					const { engine } = window;
					if (!engine) return false;
					const gain = engine.volumeGain?.gain;
					if (gain == null) return false;
					return gain.value !== 1;
				}),
			{ timeout: 10_000 }
		)
		.toBe(enabled);
}
test.describe("volumeBoost", () => {
	test.describe("volumeBoost (global)", () => {
		for (const pageType of testPages) {
			test(`should set global volume boost to 10 on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "global");
				await setOption(page, "volumeBoost.amount", 10);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
			});
		}
	});
	const buttonTestPages = testPages.filter((p) => p !== "shorts");
	test.describe("volumeBoost (button)", () => {
		for (const pageType of buttonTestPages) {
			test(`button should be enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await setOption(page, "volumeBoost.button.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			});
			test(`button should be disabled when feature is off on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await disableFeature(page, "volumeBoost.enabled");
				await expectFeatureButtonToBeFalsy(page, "yte-feature-volumeBoostButton-button");
			});
			test(`button should set volume boost to 10 on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await setOption(page, "volumeBoost.amount", 10);
				await setOption(page, "volumeBoost.button.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
				await clickFeatureButton(page, pageType, "yte-feature-volumeBoostButton-button", right);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
			});
			test(`button should toggle off when clicked again on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await setOption(page, "volumeBoost.amount", 10);
				await setOption(page, "volumeBoost.button.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
				await clickFeatureButton(page, pageType, "yte-feature-volumeBoostButton-button", right);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
				await clickFeatureButton(page, pageType, "yte-feature-volumeBoostButton-button", right);
				await expectVolumeBoostEnabled(page, false);
			});
		}
	});
});
