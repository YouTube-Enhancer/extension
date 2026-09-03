import { expect, test } from "playwright.config";

import { deepDarkPreset, deepDarkPresets } from "@/src/deepDarkPresets";
import { metadata } from "@/src/features/deepDarkCSS/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { home, watch } = pageTypeRecord;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("deepDarkCSS", () => {
	for (const pageType of testPages) {
		test(`should inject deep dark CSS on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBeGreaterThan(0);
		});
		test(`should remove deep dark CSS when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBeGreaterThan(0);
			await disableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 5000 }).toBe(0);
		});
		test(`should persist deep dark CSS after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBeGreaterThan(0);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "deepDarkCSS.enabled");
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBeGreaterThan(0);
		});
		test(`should update deep dark CSS content when preset changes on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBeGreaterThan(0);
			const initialContent = await page.locator("#yte-deep-dark-css").textContent();
			expect(initialContent).toContain("#00adee");
			await setOption(page, "deepDarkCSS.preset", "Discord");
			const updatedContent = await page.locator("#yte-deep-dark-css").textContent();
			expect(updatedContent).toContain("#7289da");
		});
		test(`should work on re-enable after disable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBeGreaterThan(0);
			await disableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 5000 }).toBe(0);
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBeGreaterThan(0);
		});
		test(`persists deep dark CSS after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "deepDarkCSS.enabled");
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBeGreaterThan(0);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 15000 }).toBeGreaterThan(0);
		});
	}
	test("applies every bundled preset on watch", async ({ page }) => {
		test.setTimeout(180_000);
		await navigateToPageType(page, watch);
		await enableFeature(page, "deepDarkCSS.enabled");
		await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBeGreaterThan(0);
		for (const preset of deepDarkPreset) {
			if (preset === "Custom") continue;
			const mainColor = /--main-color:\s*([^;]+);/.exec(deepDarkPresets[preset])?.[1]?.trim();
			expect(mainColor, `${preset} declares --main-color`).toBeTruthy();
			await setOption(page, "deepDarkCSS.preset", preset);
			await expect
				.poll(async () => page.locator("#yte-deep-dark-css").textContent(), { timeout: 5000 })
				.toMatch(new RegExp(`--main-color:\\s*${mainColor}`));
		}
	});
});
