import { expect, test } from "playwright.config";

import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

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
