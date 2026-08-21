import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyDisableAmbientMode/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

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
	}
});
