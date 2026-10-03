import { expect, test } from "playwright.config";

import type { pageTypeRecord } from "@/src/utils/_tests/constants";

import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const testPages: (keyof typeof pageTypeRecord)[] = ["watch", "home"];

test.describe("customFontFamily", () => {
	for (const pageType of testPages) {
		test(`applies custom font family when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "customFontFamily.enabled");
			await expect
				.poll(
					async () => {
						return page.evaluate(() => {
							const style = document.getElementById("yte-custom-font-family");
							return style?.textContent ?? null;
						});
					},
					{ timeout: 10_000 }
				)
				.toContain("font-family");
		});
		test(`does not apply font by default on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const hasStyle = await page.evaluate(
				() => !!document.getElementById("yte-custom-font-family")
			);
			test.expect(hasStyle).toBe(false);
		});
		test(`removes style element after disable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "customFontFamily.enabled");
			await expect
				.poll(
					async () => page.evaluate(() => !!document.getElementById("yte-custom-font-family")),
					{ timeout: 10_000 }
				)
				.toBe(true);
			await disableFeature(page, "customFontFamily.enabled");
			await expect
				.poll(
					async () => page.evaluate(() => !!document.getElementById("yte-custom-font-family")),
					{ timeout: 10_000 }
				)
				.toBe(false);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "customFontFamily.enabled");
			await expect
				.poll(
					async () => page.evaluate(() => !!document.getElementById("yte-custom-font-family")),
					{ timeout: 10_000 }
				)
				.toBe(true);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect
				.poll(
					async () => {
						return page.evaluate(() => {
							const style = document.getElementById("yte-custom-font-family");
							return style?.textContent ?? null;
						});
					},
					{ timeout: 10_000 }
				)
				.toContain("font-family");
		});
		test(`updates font family when config changes on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "customFontFamily.enabled");
			await expect
				.poll(
					async () => page.evaluate(() => !!document.getElementById("yte-custom-font-family")),
					{ timeout: 10_000 }
				)
				.toBe(true);
			await setOption(page, "customFontFamily.fontFamily", "Georgia, serif");
			await expect
				.poll(
					async () => {
						return page.evaluate(() => {
							const style = document.getElementById("yte-custom-font-family");
							return style?.textContent ?? null;
						});
					},
					{ timeout: 10_000 }
				)
				.toContain("Georgia, serif");
		});
	}
});
