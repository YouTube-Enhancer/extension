import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playlistManagementButtons/index.metadata";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
// The selectors the feature itself uses to pick items (index.ts) and to read watch progress (utils/video).
const PLAYLIST_ITEM_SELECTOR = "ytd-playlist-video-list-renderer ytd-playlist-video-renderer:has(ytd-thumbnail-overlay-time-status-renderer)";
const PROGRESS_BAR_SELECTORS = [
	".ytd-thumbnail-overlay-resume-playback-renderer #progress",
	".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment",
	".ytwThumbnailOverlayResumePlaybackRendererThumbnailOverlayResumePlaybackProgress"
];

type ButtonCoverage = {
	items: number;
	itemsMissingRemoveButton: number;
	unwatchedWithResetButton: number;
	watched: number;
	watchedMissingResetButton: number;
};

async function expectButtonsRemoved(page: Page): Promise<void> {
	await expect(page.locator(".yte-remove-button")).not.toBeAttached();
	await expect(page.locator(".yte-reset-button")).not.toBeAttached();
}

/** Fails when an item the feature targets has no remove button, and when the fixture has no items at all. */
async function expectRemoveButtons(page: Page, timeout = 10000): Promise<void> {
	await expect
		.poll(
			async () => {
				const { items, itemsMissingRemoveButton } = await readButtonCoverage(page);
				return { hasItems: items > 0, itemsMissingRemoveButton };
			},
			{ timeout }
		)
		.toEqual({ hasItems: true, itemsMissingRemoveButton: 0 });
}

/**
 * Fails when a watched item has no reset button, when an unwatched item has one, and when the fixture has
 * lost the watched items the reset button depends on.
 */
async function expectResetButtons(page: Page, timeout = 10000): Promise<void> {
	await expect
		.poll(
			async () => {
				const { unwatchedWithResetButton, watched, watchedMissingResetButton } = await readButtonCoverage(page);
				return { hasWatchedItems: watched > 0, unwatchedWithResetButton, watchedMissingResetButton };
			},
			{ timeout }
		)
		.toEqual({ hasWatchedItems: true, unwatchedWithResetButton: 0, watchedMissingResetButton: 0 });
}

async function readButtonCoverage(page: Page): Promise<ButtonCoverage> {
	return await page.evaluate(
		({ itemSelector, progressSelectors }) => {
			const items = Array.from(document.querySelectorAll(itemSelector));
			const isWatched = (item: Element) =>
				progressSelectors.some((selector) => {
					const progressBar = item.querySelector<HTMLElement>(selector);
					return !!progressBar && (parseFloat(progressBar.style.width) || 0) > 0;
				});
			const watched = items.filter(isWatched);
			return {
				items: items.length,
				itemsMissingRemoveButton: items.filter((item) => !item.querySelector(".yte-remove-button")).length,
				unwatchedWithResetButton: items.filter((item) => !isWatched(item) && item.querySelector(".yte-reset-button")).length,
				watched: watched.length,
				watchedMissingResetButton: watched.filter((item) => !item.querySelector(".yte-reset-button")).length
			};
		},
		{ itemSelector: PLAYLIST_ITEM_SELECTOR, progressSelectors: PROGRESS_BAR_SELECTORS }
	);
}

test.describe("playlistManagementButtons", () => {
	for (const pageType of testPages) {
		test(`remove button should appear on playlist items when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await expectRemoveButtons(page);
		});

		test(`reset button should appear on playlist items when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectResetButtons(page);
		});

		test(`buttons should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectRemoveButtons(page);
			await expectResetButtons(page);
			await disableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await disableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectButtonsRemoved(page);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectRemoveButtons(page);
			await expectResetButtons(page, 15000);
		});

		test(`buttons should persist after full page reload on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectRemoveButtons(page);
			await expectResetButtons(page);
			await page.reload();
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await expectRemoveButtons(page);
			await expectResetButtons(page);
		});
	}
});
