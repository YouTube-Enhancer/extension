import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyMaximizePlayer/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home } = pageTypeRecord;

async function isPlayerMaximized(page: Page): Promise<boolean> {
	return await page.locator("body").evaluate((body) => body.hasAttribute("yte-maximized"));
}

test.describe("automaticallyMaximizePlayer", () => {
	for (const pageType of testPages) {
		test(`player should automatically maximize on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeTruthy();
		});
		test(`player shouldn't automatically maximize on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeFalsy();
		});
		test(`player should maximize after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeTruthy();
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "automaticallyMaximizePlayer.enabled");
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeTruthy();
		});
		test(`player should re-maximize after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeTruthy();
			await disableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeFalsy();
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeTruthy();
		});
		test(`player should maximize after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeTruthy();
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
		});
		test(`restores player to original state when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const wasMaximized = await isPlayerMaximized(page);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeTruthy();
			await disableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBe(wasMaximized);
		});
	}

	test(`should not maximize player on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect.poll(async () => await isPlayerMaximized(page)).toBeFalsy();
	});
});
