import { expect, test } from "playwright.config";

import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const testPages = ["watch", "live", "shorts"] as const;
const placement = "player_controls_right" as const;
test.describe("volumeBoost", () => {
	for (const pageType of testPages) {
		test(`should set global volume boost to 10 on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "global");
			await setOption(page, "volumeBoost.amount", 10);
			const volumeBoostEnabled = await page.evaluate(() => {
				return window.gainNode && window.gainNode.gain.value !== 1;
			});
			expect(volumeBoostEnabled).toBeTruthy();
		});
		test(`volume boost button should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.button.placement", placement);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
		});
		test(`volume boost button should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "volumeBoost.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-volumeBoostButton-button");
		});
		test(`volume boost button should set volume boost to 10 on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", placement);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			await clickFeatureButton(page, "yte-feature-volumeBoostButton-button", placement);
			const volumeBoostEnabled = await page.evaluate(() => {
				return window.gainNode && window.gainNode.gain.value !== 1;
			});
			expect(volumeBoostEnabled).toBeTruthy();
		});
		test(`volume boost button should toggle off when clicking again on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			// Enable boost
			await clickFeatureButton(page, "yte-feature-volumeBoostButton-button", placement);
			const boostEnabled = await page.evaluate(() => {
				return window.gainNode && window.gainNode.gain.value !== 1;
			});
			expect(boostEnabled).toBeTruthy();
			// Disable boost
			await clickFeatureButton(page, "yte-feature-volumeBoostButton-button", placement);
			const boostDisabled = await page.evaluate(() => {
				return !window.gainNode || window.gainNode.gain.value === 1;
			});
			expect(boostDisabled).toBeTruthy();
		});
	}
});
