import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/miniPlayer/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { home, watch } = pageTypeRecord;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

test.describe("miniPlayer", () => {
	for (const pageType of testPages) {
		test(`should create sentinel element on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
		});
		test(`should create sentinel element after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "miniPlayer.enabled");
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
		});
	}

	// Watch only: onEnable/onDisable have no live-vs-watch branch (the sentinel is inserted before any page-dependent lookup) and live stays covered by the create-sentinel smoke test.
	test(`should re-create sentinel after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
		await disableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).not.toBeAttached();
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
	});
	// Watch only: on watch the post-reload navigateToPageType skips the goto so the assertion really follows the reload; on live it navigates away again.
	test(`should persist sentinel after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
		await page.reload();
		await navigateToPageType(page, watch);
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
	});

	test(`should not create sentinel element on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).not.toBeAttached();
	});
	test(`should not leak sentinel when navigating from target to non-target page`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
		await navigateToPageType(page, nonTargetPage!);
		await expect(page.locator("#yte-mini-player-sentinel")).not.toBeAttached();
	});

	test.describe("state persistence", () => {
		test("miniPlayer state is stored in extension storage", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayer.enabled");
			await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();

			const state = await readStoredState(page);
			const miniPlayerState = state.miniPlayer as undefined | { manualOverride: boolean; rect: unknown };
			expect(miniPlayerState).toBeDefined();
			expect(typeof miniPlayerState!.manualOverride).toBe("boolean");
		});
	});
});
