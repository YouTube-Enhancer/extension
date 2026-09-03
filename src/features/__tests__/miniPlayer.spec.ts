import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/miniPlayer/index.metadata";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { home, watch } = pageTypeRecord;
const { right } = placementRecord;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

type MiniPlayerStoredState = { manualOverride: boolean; rect: null | { height: number; width: number; x: number; y: number } };

async function readMiniPlayerState(page: Page): Promise<MiniPlayerStoredState | undefined> {
	const state = await readStoredState(page);
	return state.miniPlayer as MiniPlayerStoredState | undefined;
}

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
			// No disable/re-enable cycle afterwards: the sentinel has to come back from the navigation itself. On watch
			// that needs a genuine in-page navigation; on live navigateToPageType clicks through from the channel page.
			if (pageType === watch) await spaNavigateToRelatedVideo(page);
			else {
				await navigateToPageType(page, home);
				await navigateToPageType(page, pageType);
			}
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
		await reloadPage(page, watch);
		await expect(page.locator("#yte-mini-player-sentinel")).toBeAttached();
	});

	test(`should not create sentinel element on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "miniPlayer.enabled");
		await expect(page.locator("#yte-mini-player-sentinel")).not.toBeAttached();
	});
	// navigateToPageType(nonTargetPage) is a document load, so this cannot observe cleanup across a navigation; it
	// checks the includePages gate on a fresh load while the feature is already enabled.
	test(`should not create sentinel when the feature is already enabled and the page is a non-target page`, async ({ page }) => {
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

			const initialState = await readMiniPlayerState(page);
			expect(initialState).toBeDefined();
			// onEnable resets the override, so the stored value must be false and not merely "a boolean".
			expect(initialState!.manualOverride).toBe(false);

			// Activating through the button runs toggleManual, which flips manualOverride and persists the overlay rect.
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await clickFeatureButton(page, watch, "yte-feature-miniPlayerButton-button", right);
			await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });

			await expect.poll(async () => (await readMiniPlayerState(page))?.manualOverride, { timeout: 10000 }).toBe(true);
			const activeState = await readMiniPlayerState(page);
			const { rect } = activeState!;
			expect(rect).not.toBeNull();
			for (const value of [rect!.height, rect!.width, rect!.x, rect!.y]) {
				expect(Number.isFinite(value)).toBe(true);
			}
		});
	});
});
