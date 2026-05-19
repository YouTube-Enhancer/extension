import { expect, test } from "playwright.config";

import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
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
