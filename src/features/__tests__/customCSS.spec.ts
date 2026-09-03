import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";

const { home, search, watch } = pageTypeRecord;

// The feature has no page-specific branch; an explicit page set avoids running every test on all 11 page types.
const testPages: PageType[] = [search, watch];

const probeId = "yte-test-custom-css-probe";
const probeCode = `#${probeId} { display: none !important; }`;

/**
 * The configured code is only observable through what it styles, so the tests style an element of their own:
 * an id rule cannot collide with YouTube's stylesheets, and its effect is a plain visibility change.
 */
async function injectProbeElement(page: Page): Promise<void> {
	await page.evaluate((id) => {
		if (document.getElementById(id)) return;
		const probe = document.createElement("div");
		probe.id = id;
		probe.textContent = "custom css probe";
		document.body.appendChild(probe);
	}, probeId);
	await expect(page.locator(`#${probeId}`)).toBeVisible();
}

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
		// <style> elements have no rendered text, so poll textContent instead of using the text matchers.
		await expect.poll(async () => page.locator("#yte-custom-css").textContent()).toContain("green");
		expect(await page.locator("#yte-custom-css").textContent()).not.toContain("blue");
	});
	test("persists custom CSS after navigation on watch", async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch);
		await setOption(page, "customCSS.code", "body { background: red !important; }");
		await enableFeature(page, "customCSS.enabled");
		await expect(page.locator("#yte-custom-css")).toBeAttached();
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await expect(page.locator("#yte-custom-css")).toBeAttached({ timeout: 15000 });
		await expect.poll(async () => page.locator("#yte-custom-css").textContent()).toBe("body { background: red !important; }");
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
	test("injects the configured code and the rule takes effect on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await injectProbeElement(page);
		await setOption(page, "customCSS.code", probeCode);
		await enableFeature(page, "customCSS.enabled");
		// <style> elements have no rendered text, so poll textContent instead of using the text matchers.
		await expect.poll(async () => page.locator("#yte-custom-css").textContent()).toBe(probeCode);
		await expect(page.locator(`#${probeId}`)).toBeHidden();
	});
	test("does not inject custom CSS when the code changes while the feature is disabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "customCSS.enabled");
		await injectProbeElement(page);
		// onConfigChange runs for disabled features too, so the guard against creating the element lives in updateCustomCSS.
		await setOption(page, "customCSS.code", probeCode);
		await expectToStay(async () => page.locator("#yte-custom-css").count(), 0, { page });
		await expect(page.locator(`#${probeId}`)).toBeVisible();
	});
	test("persists custom CSS after full page reload on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "customCSS.code", "body { background: red !important; }");
		await enableFeature(page, "customCSS.enabled");
		await expect(page.locator("#yte-custom-css")).toBeAttached();
		await reloadPage(page, watch);
		await expect(page.locator("#yte-custom-css")).toBeAttached({ timeout: 15000 });
	});
});
