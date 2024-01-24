import {
	clickFeatureMenuItem,
	disableFeature,
	enableFeature,
	expect,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	navigateToOptionsPage,
	navigateToYoutubePage,
	test
} from "playwright.config";
test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});
test("should enable loop button", async ({ page }) => {
	await enableFeature(page, "enable_loop_button");
});
test("should disable loop button", async ({ page }) => {
	await disableFeature(page, "enable_loop_button");
});
test("loop button should be enabled", async ({ page }) => {
	await enableFeature(page, "enable_loop_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-loopButton-menuitem");
});
test("loop button should be disabled", async ({ page }) => {
	await disableFeature(page, "enable_loop_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeFalsy(page, "yte-feature-loopButton-menuitem");
});
test("loop should be enabled", async ({ page }) => {
	await enableFeature(page, "enable_loop_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-loopButton-menuitem");
	await clickFeatureMenuItem(page, "yte-feature-loopButton-menuitem");
	const loop = await page.evaluate((selector) => {
		const videoElement = document.querySelector(selector) as unknown as HTMLVideoElement | null;
		if (!videoElement) return null;
		return videoElement.hasAttribute("loop");
	}, "div#movie_player video");
	expect(loop).toBeTruthy();
});
test("loop should be disabled", async ({ page }) => {
	await disableFeature(page, "enable_loop_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeFalsy(page, "yte-feature-loopButton-menuitem");
	const loop = await page.evaluate((selector) => {
		const videoElement = document.querySelector(selector) as unknown as HTMLVideoElement | null;
		if (!videoElement) return null;
		return videoElement.hasAttribute("loop");
	}, "div#movie_player video");
	expect(loop).toBeFalsy();
});
