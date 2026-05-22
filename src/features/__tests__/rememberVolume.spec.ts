import { expect, test } from "playwright.config";

import { volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentVolume, setVolume } from "@/src/utils/_tests/player";
const VOLUME_SAVE_WAIT = 500;

const testPages = ["watch", "live", "shorts"] as const;
const watch = "watch";
const home = "home";
test.describe("rememberVolume", () => {
	for (const pageType of testPages) {
		test(`video volume should be remembered on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			// Wait for the volumechange listener to save the new volume to storage
			await page.waitForTimeout(VOLUME_SAVE_WAIT);
			// Navigate to home and back to another video to verify volume persists
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			// Poll to allow extension's async onEnable to finish restoring volume after navigation
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 5000 }).toBe(volume);
		});
		test(`video volume shouldn't be remembered when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 5000 }).not.toBe(volume);
		});
		test(`video volume should be remembered at different levels on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, 50, pageType);
			// Wait for the volumechange listener to save the new volume to storage
			await page.waitForTimeout(VOLUME_SAVE_WAIT);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			// Poll to allow extension's async onEnable to finish restoring volume after navigation
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 5000 }).toBe(50);
		});
	}
	test("video volume should be remembered across multiple navigations", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "rememberVolume.enabled");
		await setVolume(page, 50, watch);
		// Wait for the volumechange listener to save the new volume to storage
		await page.waitForTimeout(VOLUME_SAVE_WAIT);
		await navigateToPageType(page, home);
		await navigateToPageType(page, "shorts");
		await navigateToPageType(page, watch);
		// Poll to allow extension's async onEnable to finish restoring volume after navigation
		await expect.poll(async () => getCurrentVolume(page, watch), { intervals: [200], timeout: 5000 }).toBe(50);
	});
});
