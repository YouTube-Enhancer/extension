import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/deepDarkCSS/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("deepDarkCSS", () => {
	for (const pageType of testPages) {
		test(`should inject deep dark CSS on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect(page.locator("#yte-deep-dark-css")).toBeAttached();
		});
		test(`should remove deep dark CSS when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect(page.locator("#yte-deep-dark-css")).toBeAttached();
			await disableFeature(page, "deepDarkCSS.enabled");
			await expect(page.locator("#yte-deep-dark-css")).not.toBeAttached();
		});
	}
});
