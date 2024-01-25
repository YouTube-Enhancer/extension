import { disableFeature, enableFeature, expect, navigateToOptionsPage, navigateToYoutubePage, test } from "playwright.config";
test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable open youtube settings on hover", async ({ page }) => {
	await enableFeature(page, "enable_open_youtube_settings_on_hover");
});
test("should disable open youtube settings on hover", async ({ page }) => {
	await disableFeature(page, "enable_open_youtube_settings_on_hover");
});
test("youtube settings should open on hover", async ({ page }) => {
	await enableFeature(page, "enable_open_youtube_settings_on_hover");
	await navigateToYoutubePage(page);
	const settingsButton = await page.waitForSelector(".ytp-settings-button");
	await settingsButton.hover();
	const settingsMenu = await page.waitForSelector(".ytp-settings-menu:not(#yte-feature-menu)");
	expect(settingsMenu).toBeTruthy();
});
