import {
	disableFeature,
	enableFeature,
	expect,
	expectFeatureMenuItemToBeTruthy,
	navigateToOptionsPage,
	navigateToYoutubePage,
	test
} from "playwright.config";
test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});
test("feature menu should be enabled", async ({ page }) => {
	await enableFeature(page, "enable_screenshot_button");
	await navigateToYoutubePage(page);
	const featureMenuButton = page.locator("#yte-feature-menu-button");
	await expect(featureMenuButton).toBeAttached();
});
test("feature menu should be disabled", async ({ page }) => {
	await disableFeature(page, "enable_screenshot_button");
	await navigateToYoutubePage(page);
	const featureMenuButton = page.locator("#yte-feature-menu-button");
	await expect(featureMenuButton).not.toBeVisible();
});
test("should add feature menu item to feature menu", async ({ page }) => {
	await enableFeature(page, "enable_screenshot_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
});
