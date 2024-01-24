import { disableFeature, enableFeature, navigateToOptionsPage, navigateToYoutubePage, test } from "playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable video history", async ({ page }) => {
	await enableFeature(page, "enable_video_history");
});
test("should disable video history", async ({ page }) => {
	await disableFeature(page, "enable_video_history");
});
test("video history should be enabled", async ({ page }) => {
	await enableFeature(page, "enable_video_history");
	await navigateToYoutubePage(page);
});
test("video history should be disabled", async ({ page }) => {
	await disableFeature(page, "enable_video_history");
	await navigateToYoutubePage(page);
});
