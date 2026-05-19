import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const testPages = ["watch", "live"] as const;

export async function isTheaterMode(page: Page): Promise<boolean> {
	return await page.evaluate(() => {
		const flexy = document.querySelector("ytd-watch-flexy");
		if (!flexy) return false;

		return flexy.hasAttribute("theater");
	});
}

test.describe("automaticTheaterMode", () => {
	for (const pageType of testPages) {
		test(`theater mode should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			const theaterModeEnabled = await isTheaterMode(page);
			expect(theaterModeEnabled).toBeTruthy();
			expect(theaterModeEnabled).toBe(true);
		});
		test(`theater mode should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "automaticTheaterMode.enabled");
			const theaterModeEnabled = await isTheaterMode(page);
			expect(theaterModeEnabled).toBeFalsy();
			expect(theaterModeEnabled).toBe(false);
		});
		test(`theater mode should be applied after navigation when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			let theaterModeEnabled = await isTheaterMode(page);
			expect(theaterModeEnabled).toBeTruthy();
			expect(theaterModeEnabled).toBe(true);
			await navigateToPageType(page, "watch");
			await enableFeature(page, "automaticTheaterMode.enabled");
			theaterModeEnabled = await isTheaterMode(page);
			expect(theaterModeEnabled).toBeTruthy();
			expect(theaterModeEnabled).toBe(true);
		});
	}
});
