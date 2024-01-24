import { disableFeature, enableFeature, expect, navigateToOptionsPage, navigateToYoutubePage, test } from "playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable remaining time", async ({ page }) => {
	await enableFeature(page, "enable_remaining_time");
});
test("should disable remaining time", async ({ page }) => {
	await disableFeature(page, "enable_remaining_time");
});
test("remaining time should be displayed", async ({ page }) => {
	await enableFeature(page, "enable_remaining_time");
	await navigateToYoutubePage(page);
	const remainingTimeElement = page.locator("span#ytp-time-remaining");
	await expect(remainingTimeElement).toBeAttached();
	expect(await remainingTimeElement.textContent()).toBeTruthy();
});
test("remaining time shouldn't be displayed", async ({ page }) => {
	await disableFeature(page, "enable_remaining_time");
	await navigateToYoutubePage(page);
	const remainingTimeElement = page.locator("span#ytp-time-remaining");
	await expect(remainingTimeElement).not.toBeAttached();
});
