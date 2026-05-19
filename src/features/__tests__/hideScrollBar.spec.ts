import { disableFeature, enableFeature, expect, navigateToPageType, test } from "playwright.config";

test.describe("hideScrollBar", () => {
	test("scrollbar should be hidden", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await enableFeature(page, "hideScrollBar.enabled");
		const scrollBarHidden = await page.evaluate(() => {
			return document.documentElement.clientWidth >= window.innerWidth;
		});
		expect(scrollBarHidden).toBe(true);
	});
	test("scrollbar should be visible when disabled", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await disableFeature(page, "hideScrollBar.enabled");
		const scrollBarHidden = await page.evaluate(() => {
			return document.documentElement.clientWidth >= window.innerWidth;
		});
		expect(scrollBarHidden).toBe(false);
	});
});
