import { disableFeature, enableFeature, expect, navigateToPageType, test } from "playwright.config";

test.describe("remainingTime", () => {
	test("remaining time should be displayed", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await enableFeature(page, "remainingTime.enabled");
		const remainingTimeElement = page.locator("span#ytp-time-remaining");
		await expect(remainingTimeElement).toBeAttached();
		expect(await remainingTimeElement.textContent()).toBeTruthy();
	});
	test("remaining time shouldn't be displayed", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await disableFeature(page, "remainingTime.enabled");
		const remainingTimeElement = page.locator("span#ytp-time-remaining");
		await expect(remainingTimeElement).not.toBeAttached();
	});
});
