import {
	clickFeatureMenuItem,
	disableFeature,
	enableFeature,
	expect,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	navigateToPageType,
	setOption,
	test
} from "playwright.config";

const testPages = ["watch", "live", "shorts"] as const;

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
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-volumeBoostButton-menuitem");
		});
		test(`volume boost button should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "volumeBoost.enabled");
			await expectFeatureMenuItemToBeFalsy(page, "yte-feature-volumeBoostButton-menuitem");
		});
		test(`volume boost button should set volume boost to 10 on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-volumeBoostButton-menuitem");
			await clickFeatureMenuItem(page, "yte-feature-volumeBoostButton-menuitem");
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
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-volumeBoostButton-menuitem");
			// Enable boost
			await clickFeatureMenuItem(page, "yte-feature-volumeBoostButton-menuitem");
			const boostEnabled = await page.evaluate(() => {
				return window.gainNode && window.gainNode.gain.value !== 1;
			});
			expect(boostEnabled).toBeTruthy();
			// Disable boost
			await clickFeatureMenuItem(page, "yte-feature-volumeBoostButton-menuitem");
			const boostDisabled = await page.evaluate(() => {
				return !window.gainNode || window.gainNode.gain.value === 1;
			});
			expect(boostDisabled).toBeTruthy();
		});
	}
});
