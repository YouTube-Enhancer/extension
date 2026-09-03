import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const { home, search, watch } = pageTypeRecord;

// The feature has no page-specific branch; an explicit page set avoids running every test on all 11 page types.
const testPages: PageType[] = [search, watch];

test.describe("customCSS", () => {
	for (const pageType of testPages) {
		test(`should inject custom CSS on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "customCSS.code", "body { background: red !important; }");
			await enableFeature(page, "customCSS.enabled");
			await expect(page.locator("#yte-custom-css")).toBeAttached();
		});
	}
	test("should update custom CSS content on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "customCSS.code", "body { color: blue !important; }");
		await enableFeature(page, "customCSS.enabled");
		await expect(page.locator("#yte-custom-css")).toBeAttached();
		await setOption(page, "customCSS.code", "body { color: green !important; }");
		const textContent = await page.locator("#yte-custom-css").textContent();
		expect(textContent).toContain("green");
	});
	test("persists custom CSS after navigation on watch", async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch);
		await setOption(page, "customCSS.code", "body { background: red !important; }");
		await enableFeature(page, "customCSS.enabled");
		await expect(page.locator("#yte-custom-css")).toBeAttached();
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await disableFeature(page, "customCSS.enabled");
		await enableFeature(page, "customCSS.enabled");
		await expect(page.locator("#yte-custom-css")).toBeAttached();
	});
	test("re-applies after disable then re-enable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "customCSS.code", "body { background: red !important; }");
		await enableFeature(page, "customCSS.enabled");
		await expect(page.locator("#yte-custom-css")).toBeAttached();
		await disableFeature(page, "customCSS.enabled");
		await expect(page.locator("#yte-custom-css")).not.toBeAttached();
		await enableFeature(page, "customCSS.enabled");
		await expect(page.locator("#yte-custom-css")).toBeAttached();
	});
	test("persists custom CSS after full page reload on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "customCSS.code", "body { background: red !important; }");
		await enableFeature(page, "customCSS.enabled");
		await expect(page.locator("#yte-custom-css")).toBeAttached();
		await page.reload();
		await navigateToPageType(page, watch);
		await expect(page.locator("#yte-custom-css")).toBeAttached({ timeout: 15000 });
	});
});
