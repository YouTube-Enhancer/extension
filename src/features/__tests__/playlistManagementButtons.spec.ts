import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playlistManagementButtons/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
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
// The header the feature appends the remove-all button to, and the button's own id (index.ts).
const PLAYLIST_HEADER_SELECTOR = "chip-bar-view-model";
const REMOVE_ALL_BUTTON_SELECTOR = `${PLAYLIST_HEADER_SELECTOR} #yte-remove-all-watched-button`;
const { playlist } = pageTypeRecord;

type ButtonCoverage = {
	items: number;
	itemsMissingRemoveButton: number;
	unwatchedWithResetButton: number;
	watched: number;
	watchedMissingResetButton: number;
};

async function countPlaylistItems(page: Page): Promise<number> {
	return await page.locator(PLAYLIST_ITEM_SELECTOR).count();
}

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

/** The remove-all button is only offered for fully watched items, and only inside YouTube's chip bar header. */
async function readRemoveAllState(page: Page): Promise<{ fullyWatched: number; hasHeader: boolean }> {
	return await page.evaluate(
		({ headerSelector, itemSelector, progressSelectors }) => {
			const items = Array.from(document.querySelectorAll(itemSelector));
			const watchedPercentage = (item: Element) => {
				for (const selector of progressSelectors) {
					const progressBar = item.querySelector<HTMLElement>(selector);
					if (progressBar) return parseFloat(progressBar.style.width) || 0;
				}
				return 0;
			};
			return {
				fullyWatched: items.filter((item) => watchedPercentage(item) === 100).length,
				hasHeader: document.querySelector(headerSelector) !== null
			};
		},
		{ headerSelector: PLAYLIST_HEADER_SELECTOR, itemSelector: PLAYLIST_ITEM_SELECTOR, progressSelectors: PROGRESS_BAR_SELECTORS }
	);
}

/** Scrolls to the end of the playlist until YouTube renders more rows. Returns false when it never does. */
async function scrollUntilMoreItems(page: Page, itemsBefore: number): Promise<boolean> {
	try {
		await expect
			.poll(
				async () => {
					await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
					return countPlaylistItems(page);
				},
				{ intervals: [1000], timeout: 45000 }
			)
			.toBeGreaterThan(itemsBefore);
		return true;
	} catch {
		return false;
	}
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

	test(`remove all watched videos button should appear in the playlist header when enabled and disappear when disabled on ${playlist}`, async ({
		page
	}) => {
		test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
		await navigateToPageType(page, playlist, ["playlistManagementButtons"]);
		const { fullyWatched, hasHeader } = await readRemoveAllState(page);
		test.skip(!hasHeader, "the playlist page rendered no chip bar header for the button to live in");
		test.skip(fullyWatched === 0, "the playlist fixture has no fully watched videos, so the button has nothing to offer");
		await enableFeature(page, "playlistManagementButtons.removeAllButton.enabled");
		const removeAllButton = page.locator(REMOVE_ALL_BUTTON_SELECTOR);
		await expect(removeAllButton).toBeAttached({ timeout: 15000 });
		// The label carries the count of fully watched videos, pluralised. Both are re-read every poll, so a
		// row loading in mid-assertion cannot decide the outcome.
		await expect
			.poll(
				async () => {
					const label = await removeAllButton.textContent();
					const { fullyWatched: watchedNow } = await readRemoveAllState(page);
					return label === `Remove ${watchedNow} watched video${watchedNow === 1 ? "" : "s"}`;
				},
				{ timeout: 15000 }
			)
			.toBe(true);
		// The three sub-toggles are independent: this one must not bring the per-item buttons along.
		await expectButtonsRemoved(page);
		await disableFeature(page, "playlistManagementButtons.removeAllButton.enabled");
		await expect(removeAllButton).not.toBeAttached({ timeout: 10000 });
	});

	test(`disabling only the remove button should keep the reset buttons on ${playlist}`, async ({ page }) => {
		test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
		await navigateToPageType(page, playlist, ["playlistManagementButtons"]);
		await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
		await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
		await expectRemoveButtons(page);
		await expectResetButtons(page);
		// The feature stays enabled, so this runs onConfigChange, which strips both button classes before it
		// rebuilds. The reset buttons have to come back from that rebuild.
		await disableFeature(page, "playlistManagementButtons.removeButton.enabled");
		await expect(page.locator(".yte-remove-button")).not.toBeAttached({ timeout: 10000 });
		await expectResetButtons(page, 15000);
		await expectToStay(async () => page.locator(".yte-remove-button").count(), 0, { page });
	});

	test(`buttons should be added to playlist items rendered after enabling on ${playlist}`, async ({ page }) => {
		test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
		test.setTimeout(120_000);
		await navigateToPageType(page, playlist, ["playlistManagementButtons"]);
		await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
		await expectRemoveButtons(page);
		const itemsBefore = await countPlaylistItems(page);
		expect(itemsBefore).toBeGreaterThan(0);
		// Rows YouTube renders after the initial pass can only be reached by the MutationObserver.
		const renderedMoreItems = await scrollUntilMoreItems(page, itemsBefore);
		test.skip(!renderedMoreItems, "the playlist fixture rendered all of its rows up front");
		await expect.poll(async () => countPlaylistItems(page), { timeout: 10000 }).toBeGreaterThan(itemsBefore);
		await expectRemoveButtons(page, 15000);
	});
});
