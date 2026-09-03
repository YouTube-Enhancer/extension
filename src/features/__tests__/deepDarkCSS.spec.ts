import { expect, test } from "playwright.config";

import { deepDarkPreset, deepDarkPresets } from "@/src/deepDarkPresets";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const { shorts, watch } = pageTypeRecord;

test.describe("deepDarkCSS", () => {
	// The feature only appends/removes a <style> in document.head and has no page-specific branch, so one non-watch shell is enough.
	test("should inject deep dark CSS on shorts", async ({ page }) => {
		await navigateToPageType(page, shorts);
		await enableFeature(page, "deepDarkCSS.enabled");
		await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBe(1);
	});
	test("should work on re-enable after disable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "deepDarkCSS.enabled");
		await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBe(1);
		await disableFeature(page, "deepDarkCSS.enabled");
		await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 5000 }).toBe(0);
		await enableFeature(page, "deepDarkCSS.enabled");
		await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBe(1);
	});
	test("persists deep dark CSS after full page reload on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "deepDarkCSS.enabled");
		await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBe(1);
		await page.reload();
		await navigateToPageType(page, watch);
		await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 15000 }).toBe(1);
	});
	test("applies every bundled preset on watch", async ({ page }) => {
		test.setTimeout(180_000);
		await navigateToPageType(page, watch);
		await enableFeature(page, "deepDarkCSS.enabled");
		await expect.poll(async () => await page.locator("#yte-deep-dark-css").count(), { timeout: 10000 }).toBe(1);
		const initialContent = await page.locator("#yte-deep-dark-css").textContent();
		expect(initialContent).toContain("#00adee");
		for (const preset of deepDarkPreset) {
			if (preset === "Custom") continue;
			const mainColor = /--main-color:\s*([^;]+);/.exec(deepDarkPresets[preset])?.[1]?.trim();
			expect(mainColor, `${preset} declares --main-color`).toBeTruthy();
			await setOption(page, "deepDarkCSS.preset", preset);
			await expect
				.poll(async () => page.locator("#yte-deep-dark-css").textContent(), { timeout: 5000 })
				.toMatch(new RegExp(`--main-color:\s*${mainColor}`));
		}
	});
});
