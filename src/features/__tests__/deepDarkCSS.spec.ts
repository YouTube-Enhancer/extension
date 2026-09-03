import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { deepDarkPreset, deepDarkPresets } from "@/src/deepDarkPresets";
import { expectFeatureButtonToBeIn, expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const { shorts, watch } = pageTypeRecord;
const { below } = placementRecord;

const customBackground = "#123456";
const customBackgroundRgb = "rgb(18, 52, 86)";
const customMainColor = "#ff00ff";

/** deepDarkMaterial paints `html` from `--main-background`, so this is the cheapest proof the sheet is live rather than inert. */
async function getHtmlBackgroundColor(page: Page): Promise<string> {
	return page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
}

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
				.toMatch(new RegExp(`--main-color:\\s*${mainColor}`));
		}
	});
	test("applies the Custom preset colors to the injected CSS on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "deepDarkCSS.preset", "Custom");
		await setOption(page, "deepDarkCSS.colors.mainColor", customMainColor);
		await setOption(page, "deepDarkCSS.colors.mainBackground", customBackground);
		await enableFeature(page, "deepDarkCSS.enabled");
		// The preset loop above skips "Custom", so getDeepDarkCustomThemeStyle is only exercised here.
		await expect.poll(async () => page.locator("#yte-deep-dark-css").textContent(), { timeout: 10000 }).toMatch(/--main-color:\s*#ff00ff/);
		expect(await page.locator("#yte-deep-dark-css").textContent()).toMatch(/--main-background:\s*#123456/);
		await setOption(page, "deepDarkCSS.colors.mainColor", "#00ff88");
		await expect.poll(async () => page.locator("#yte-deep-dark-css").textContent(), { timeout: 10000 }).toMatch(/--main-color:\s*#00ff88/);
		expect(await page.locator("#yte-deep-dark-css").textContent()).not.toMatch(/--main-color:\s*#ff00ff/);
	});
	test("repaints the page background while enabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "deepDarkCSS.preset", "Custom");
		await setOption(page, "deepDarkCSS.colors.mainBackground", customBackground);
		await enableFeature(page, "deepDarkCSS.enabled");
		// Counting or reading the style tag cannot tell an applied sheet from an inert one; the painted colour can.
		await expect.poll(async () => getHtmlBackgroundColor(page), { timeout: 15000 }).toBe(customBackgroundRgb);
		await disableFeature(page, "deepDarkCSS.enabled");
		await expect.poll(async () => getHtmlBackgroundColor(page), { timeout: 10000 }).not.toBe(customBackgroundRgb);
	});
	test("sets, updates and clears the html deep dark data attributes on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "deepDarkCSS.preset", "Deep-Dark");
		await enableFeature(page, "deepDarkCSS.enabled");
		// getDeepDarkData reads these attributes to resolve button colours, so they are the feature's second output.
		await expect(page.locator("html")).toHaveAttribute("data-yte-deep-dark-preset", "Deep-Dark", { timeout: 10000 });
		await expect(page.locator("html")).not.toHaveAttribute("data-yte-deep-dark-colors", /.*/);
		await setOption(page, "deepDarkCSS.preset", "Custom");
		await setOption(page, "deepDarkCSS.colors.mainColor", customMainColor);
		await expect(page.locator("html")).toHaveAttribute("data-yte-deep-dark-preset", "Custom", { timeout: 10000 });
		await expect(page.locator("html")).toHaveAttribute("data-yte-deep-dark-colors", new RegExp(customMainColor), { timeout: 10000 });
		await disableFeature(page, "deepDarkCSS.enabled");
		await expect(page.locator("html")).not.toHaveAttribute("data-yte-deep-dark-preset", /.*/, { timeout: 10000 });
		await expect(page.locator("html")).not.toHaveAttribute("data-yte-deep-dark-colors", /.*/);
	});
	test("recolors below player button icons for light and dark backgrounds on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "screenshotButton.button.placement", below);
		await enableFeature(page, "screenshotButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", below);
		await enableFeature(page, "deepDarkCSS.enabled");
		await setOption(page, "deepDarkCSS.preset", "Custom");
		// updateButtonsIconColor only touches the below player container, and resolveContrastColor picks the icon colour
		// from --main-background, so a light background must flip the stroke to black.
		await setOption(page, "deepDarkCSS.colors.mainBackground", "#FFFFFF");
		await expect(page.locator("#yte-feature-screenshotButton-button svg")).toHaveAttribute("stroke", "#000000", { timeout: 15000 });
		await setOption(page, "deepDarkCSS.colors.mainBackground", "#000000");
		await expect(page.locator("#yte-feature-screenshotButton-button svg")).toHaveAttribute("stroke", "#FFFFFF", { timeout: 15000 });
	});
	test("does not inject deep dark CSS before it is enabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await expectToStay(async () => page.locator("#yte-deep-dark-css").count(), 0, { page });
	});
	test("does not inject deep dark CSS when the preset changes while disabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "deepDarkCSS.enabled");
		// onConfigChange runs for disabled features too; only the deepDarkCSSExists guard keeps the sheet out of the page.
		await setOption(page, "deepDarkCSS.preset", "Dracula");
		await expectToStay(async () => page.locator("#yte-deep-dark-css").count(), 0, { page });
	});
});
