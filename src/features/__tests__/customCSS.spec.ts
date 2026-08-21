import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/customCSS/index.metadata";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("customCSS", () => {
	for (const pageType of testPages) {
		test(`should inject custom CSS on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "customCSS.code", "body { background: red !important; }");
			await enableFeature(page, "customCSS.enabled");
			await expect(page.locator("#yte-custom-css")).toBeAttached();
		});
		test(`should remove custom CSS when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "customCSS.enabled");
			await setOption(page, "customCSS.code", "body { background: red !important; }");
			await expect(page.locator("#yte-custom-css")).toBeAttached();
			await disableFeature(page, "customCSS.enabled");
			await expect(page.locator("#yte-custom-css")).not.toBeAttached();
		});
		test(`should update custom CSS content on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "customCSS.code", "body { color: blue !important; }");
			await enableFeature(page, "customCSS.enabled");
			await expect(page.locator("#yte-custom-css")).toBeAttached();
			await setOption(page, "customCSS.code", "body { color: green !important; }");
			const textContent = await page.locator("#yte-custom-css").textContent();
			expect(textContent).toContain("green");
		});
	}
});
