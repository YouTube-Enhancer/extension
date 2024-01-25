import {
	clickFeatureMenuItem,
	disableFeature,
	enableFeature,
	expect,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	navigateToOptionsPage,
	navigateToYoutubePage,
	selectOption,
	setValue,
	test
} from "playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable volume boost", async ({ page }) => {
	await enableFeature(page, "enable_volume_boost");
});
test("should disable volume boost", async ({ page }) => {
	await disableFeature(page, "enable_volume_boost");
});
test("per video volume boost button should be enabled", async ({ page }) => {
	await enableFeature(page, "enable_volume_boost");
	await selectOption(page, "volume_boost_mode", "per_video");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-volumeBoostButton-menuitem");
});
test("per video volume boost button should be disabled", async ({ page }) => {
	await disableFeature(page, "enable_volume_boost");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeFalsy(page, "yte-feature-volumeBoostButton-menuitem");
});
test("should set global volume boost to 10", async ({ page }) => {
	await enableFeature(page, "enable_volume_boost");
	await selectOption(page, "volume_boost_mode", "global");
	await setValue(page, "volume_boost_amount", 10);
	await navigateToYoutubePage(page);
	const volumeBoostEnabled = await page.evaluate(() => {
		return window.gainNode && window.gainNode.gain.value !== 1;
	});
	expect(volumeBoostEnabled).toBeTruthy();
});
test("should set per video volume boost to 10", async ({ page }) => {
	await enableFeature(page, "enable_volume_boost");
	await selectOption(page, "volume_boost_mode", "per_video");
	await setValue(page, "volume_boost_amount", 10);
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-volumeBoostButton-menuitem");
	await clickFeatureMenuItem(page, "yte-feature-volumeBoostButton-menuitem");
	const volumeBoostEnabled = await page.evaluate(() => {
		return window.gainNode && window.gainNode.gain.value !== 1;
	});
	expect(volumeBoostEnabled).toBeTruthy();
});
