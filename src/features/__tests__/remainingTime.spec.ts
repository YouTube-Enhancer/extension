import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/remainingTime/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("remainingTime", () => {
	for (const pageType of testPages) {
		test(`remaining time should be displayed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "remainingTime.enabled");
			const remainingTimeElement = page.locator("span#ytp-time-remaining");
			await expect(remainingTimeElement).toBeAttached();
			expect(await remainingTimeElement.textContent()).toBeTruthy();
		});
		test(`remaining time shouldn't be displayed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "remainingTime.enabled");
			const remainingTimeElement = page.locator("span#ytp-time-remaining");
			await expect(remainingTimeElement).not.toBeAttached();
		});
	}
});
