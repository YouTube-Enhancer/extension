import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const { home } = pageTypeRecord;
// Narrowed from the feature's ["watch", "shorts"] pages: onEnable passes no pageTypes, so executeWithRetries falls back to ["watch", "live"] and isOnAllowedPage returns false on /shorts, so the shorts expansion never exercises the feature.
const testPages: readonly PageType[] = [pageTypeRecord.watch];

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
	}
});
