import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/timestampPeek/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("timestampPeek", () => {
	for (const pageType of testPages) {
		test(`should show preview overlay when hovering a timestamp in the description on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["timestamps"]);
			await enableFeature(page, "timestampPeek.enabled");

			const timestampLink = page.locator("yt-attributed-string a[href*='&t=']").first();
			await expect(timestampLink).toBeAttached({ timeout: 15000 });

			await timestampLink.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
			await timestampLink.hover({ force: true });
			await expect(page.locator("#yte-timestamp-peek-overlay")).toBeAttached({ timeout: 5000 });
		});

		test(`should clean up overlay elements when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["timestamps"]);
			await enableFeature(page, "timestampPeek.enabled");
			await disableFeature(page, "timestampPeek.enabled");
			await expect(page.locator("#yte-timestamp-peek-overlay")).not.toBeAttached();
			await expect(page.locator("#yte-timestamp-peek-placeholder")).not.toBeAttached();
			await expect(page.locator("#yte-timestamp-peek-hover-shield")).not.toBeAttached();
		});
	}
});
