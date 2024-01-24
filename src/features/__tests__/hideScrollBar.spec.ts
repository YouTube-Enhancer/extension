import { disableFeature, enableFeature, expect, navigateToOptionsPage, navigateToYoutubePage, test } from "playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});
test("should enable hide scrollbar", async ({ page }) => {
	await enableFeature(page, "enable_hide_scrollbar");
});
test("should disable hide scrollbar", async ({ page }) => {
	await disableFeature(page, "enable_hide_scrollbar");
});
test("Scrollbar should be hidden", async ({ page }) => {
	await enableFeature(page, "enable_hide_scrollbar");
	await navigateToYoutubePage(page);
	const scrollBarHidden = await page.evaluate(() => {
		return document.documentElement.clientWidth >= window.innerWidth;
	});
	expect(scrollBarHidden).toBe(true);
});
test("Scrollbar should be visible", async ({ page }) => {
	await disableFeature(page, "enable_hide_scrollbar");
	await navigateToYoutubePage(page);
	const scrollBarHidden = await page.evaluate(() => {
		return document.documentElement.clientWidth >= window.innerWidth;
	});
	expect(scrollBarHidden).toBe(false);
});
