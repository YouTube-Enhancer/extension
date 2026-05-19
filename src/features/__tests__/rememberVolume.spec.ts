import { expect, test } from "playwright.config";

import { volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentVolume, setVolume } from "@/src/utils/_tests/player";

const testPages = ["watch", "live", "shorts"] as const;

test.describe("rememberVolume", () => {
	for (const pageType of testPages) {
		test(`video volume should be remembered on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			// Navigate to home and back to another video to verify volume persists
			await navigateToPageType(page, "home");
			await navigateToPageType(page, pageType);
			const currentVolume = await getCurrentVolume(page, pageType);
			expect(currentVolume).toBeTruthy();
			expect(currentVolume).toBe(volume);
		});
		test(`video volume shouldn't be remembered when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			await navigateToPageType(page, "home");
			await navigateToPageType(page, pageType);
			const currentVolume = await getCurrentVolume(page, pageType);
			expect(currentVolume).toBeTruthy();
			expect(currentVolume).not.toBe(volume);
		});
		test(`video volume should be remembered at different levels on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, 50, pageType);
			await navigateToPageType(page, "home");
			await navigateToPageType(page, pageType);
			const currentVolume = await getCurrentVolume(page, pageType);
			expect(currentVolume).toBeTruthy();
			expect(currentVolume).toBe(50);
		});
	}
	test("video volume should be remembered across multiple navigations", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await enableFeature(page, "rememberVolume.enabled");
		await setVolume(page, volume);
		await navigateToPageType(page, "home");
		await navigateToPageType(page, "shorts");
		await navigateToPageType(page, "watch");
		const currentVolume = await getCurrentVolume(page);
		expect(currentVolume).toBeTruthy();
		expect(currentVolume).toBe(volume);
	});
});
