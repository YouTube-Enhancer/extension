import {
	disableFeature,
	enableFeature,
	expect,
	getCurrentVolume,
	navigateToOptionsPage,
	navigateToYoutubePage,
	setVolume,
	test,
	volume
} from "playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable remember last volume", async ({ page }) => {
	await enableFeature(page, "enable_remember_last_volume");
});
test("should disable remember last volume", async ({ page }) => {
	await disableFeature(page, "enable_remember_last_volume");
});
test("video volume should be remembered", async ({ page }) => {
	await enableFeature(page, "enable_remember_last_volume");
	await navigateToYoutubePage(page);
	await setVolume(page, volume);
	await navigateToYoutubePage(page);
	const currentVolume = await getCurrentVolume(page);
	expect(currentVolume).toBeTruthy();
	expect(currentVolume).toBe(volume);
});
test("video volume shouldn't be remembered", async ({ page }) => {
	await disableFeature(page, "enable_remember_last_volume");
	await navigateToYoutubePage(page);
	const currentVolume = await getCurrentVolume(page);
	expect(currentVolume).toBeTruthy();
	expect(currentVolume).not.toBe(volume);
});
