import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyMaximizePlayer/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { watch } = pageTypeRecord;

async function isPlayerMaximized(page: Page): Promise<boolean> {
	return await page.locator("body").evaluate((body) => body.hasAttribute("yte-maximized"));
}

test.describe("automaticallyMaximizePlayer", () => {
	for (const pageType of testPages) {
		test(`player should automatically maximize on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
		});
		test(`player should re-maximize after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
			await disableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeFalsy();
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
		});
	}

	// Watch only: there is no page branch in automaticallyMaximizePlayer/index.ts, and the live variant costs two full live-video hunts plus a home load.
	test(`player should maximize after navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
		// A real single-page navigation: navigateStartHandler drops yte-maximized, so only onNavigate can put it back.
		await spaNavigateToRelatedVideo(page);
		await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
	});
	// Watch only: on live the reload is immediately discarded because navigateToPageType re-enters the live branch and opens a live video again.
	test(`player should maximize after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
		await reloadPage(page, watch);
		await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
	});

	test(`should not maximize player on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		// The maximize task has a 20 s budget, so a single poll would sample long before a gating regression could show.
		await expectToStay(async () => isPlayerMaximized(page), false, { durationMs: 5000, intervalMs: 500, page });
	});
});
