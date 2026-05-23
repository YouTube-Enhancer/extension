import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticTheaterMode/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

export async function expectNotTheaterMode(page: Page): Promise<void> {
	await expect
		.poll(
			async () => {
				return await page.evaluate(() => {
					const flexy = document.querySelector("ytd-watch-flexy");
					const grid = document.querySelector("ytd-watch-grid");
					return flexy?.hasAttribute("theater") || grid?.hasAttribute("theater");
				});
			},
			{ timeout: 10000 }
		)
		.toBeFalsy();
}

export async function expectTheaterMode(page: Page): Promise<void> {
	await expect
		.poll(
			async () => {
				return await page.evaluate(() => {
					const flexy = document.querySelector("ytd-watch-flexy");
					const grid = document.querySelector("ytd-watch-grid");
					return flexy?.hasAttribute("theater") || grid?.hasAttribute("theater");
				});
			},
			{ timeout: 10000 }
		)
		.toBeTruthy();
}

test.describe("automaticTheaterMode", () => {
	for (const pageType of testPages) {
		test(`theater mode should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
		});
		test(`theater mode should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "automaticTheaterMode.enabled");
			await expectNotTheaterMode(page);
		});
		test(`theater mode should be applied after navigation when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
			await navigateToPageType(page, "home");
			await navigateToPageType(page, pageType);
			await expectTheaterMode(page);
		});
	}
});
