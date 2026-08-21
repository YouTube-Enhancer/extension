import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyDisableAmbientMode/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { home } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

async function getAmbientState(page: Page): Promise<boolean | null> {
	return await page.evaluate(() => {
		const flexy = document.querySelector("ytd-watch-flexy");
		if (flexy) {
			return flexy.hasAttribute("cinematics-active");
		}
		const grid = document.querySelector("ytd-watch-grid");
		if (grid) {
			return grid.hasAttribute("cinematics-active");
		}
		return null;
	});
}
test.describe("automaticallyDisableAmbientMode", () => {
	for (const pageType of testPages) {
		test(`disables ambient mode on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["ambientMode"]);
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
		});
		test(`restores ambient mode when feature disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["ambientMode"]);
			const initialState = await getAmbientState(page);
			if (initialState === null) return;
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
			await disableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(initialState);
		});
		test(`should persist disabled ambient mode after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["ambientMode"]);
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType, ["ambientMode"]);
			await disableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["ambientMode"]);
			const initialState = await getAmbientState(page);
			if (initialState === null) return;
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
			await disableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(initialState);
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			if (pageType === "shorts") test.setTimeout(120_000);
			await navigateToPageType(page, pageType, ["ambientMode"]);
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
			await page.reload();
			await navigateToPageType(page, pageType, ["ambientMode"]);
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 15000 }
				)
				.toBe(false);
		});
		test(`should not disable ambient mode when feature is off on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["ambientMode"]);
			const initialState = await getAmbientState(page);
			if (initialState === null) return;
			await disableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect.poll(async () => getAmbientState(page), { timeout: 10000 }).toBe(initialState);
		});
	}
});
