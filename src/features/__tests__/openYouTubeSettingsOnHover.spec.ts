import { expect, test } from "playwright.config";

import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const testPages = ["watch", "live"] as const;

test.describe("openYouTubeSettingsOnHover", () => {
	for (const pageType of testPages) {
		test(`youtube settings should open on hover when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
			const settingsButton = await page.waitForSelector(".ytp-settings-button");
			await settingsButton.hover();
			const settingsMenu = await page.waitForSelector(".ytp-settings-menu:not(#yte-feature-menu)");
			expect(settingsMenu).toBeTruthy();
		});
		test(`youtube settings should not open on hover when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "openYouTubeSettingsOnHover.enabled");
			const settingsButton = await page.waitForSelector(".ytp-settings-button");
			await settingsButton.hover();
			await page.waitForTimeout(500);
			const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
			await expect(settingsMenu).not.toBeVisible();
		});
	}
});
