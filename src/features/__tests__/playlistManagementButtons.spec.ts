import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import {
	CHIP_BAR_VIEW_MODEL_HEADER_SELECTOR,
	PLAYLIST_ITEM_SELECTOR as FEATURE_ITEM_SELECTOR,
	REMOVE_ALL_BUTTON_ID,
	REMOVE_BUTTON_CLASS,
	RESET_BUTTON_CLASS
} from "@/src/features/playlistManagementButtons/constants";
import { metadata } from "@/src/features/playlistManagementButtons/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPage, navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
import { ensureInWatchLater, watchToTheEnd } from "@/src/utils/_tests/watchLater";
import { THUMBNAIL_PROGRESS_BAR_SELECTORS } from "@/src/utils/video";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
// The rows the feature adds buttons to: its own item selector narrowed to rows with a duration overlay, as index.ts does.
const PLAYLIST_ITEM_SELECTOR = `${FEATURE_ITEM_SELECTOR}:has(ytd-thumbnail-overlay-time-status-renderer)`;
const PROGRESS_BAR_SELECTORS = THUMBNAIL_PROGRESS_BAR_SELECTORS;
const PLAYLIST_HEADER_SELECTOR = CHIP_BAR_VIEW_MODEL_HEADER_SELECTOR;
const REMOVE_ALL_BUTTON_SELECTOR = `${PLAYLIST_HEADER_SELECTOR} #${REMOVE_ALL_BUTTON_ID}`;
const REMOVE_BUTTON_SELECTOR = `.${REMOVE_BUTTON_CLASS}`;
const RESET_BUTTON_SELECTOR = `.${RESET_BUTTON_CLASS}`;
/** A 34 s video kept in the account's Watch Later for the remove-all case; the test watches it to the end itself. */
const WATCH_LATER_SHORT_VIDEO = "WldIfjaOAAE";
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

/**
 * The reset button only exists on items with watch progress, and that progress is the account's: the feature's
 * own reset button removes a video from the history, so a playlist whose watched items were all reset by earlier
 * runs offers nothing to assert on. When that has happened, watch the first item for a moment and come back.
 */
async function ensureWatchedPlaylistItem(page: Page): Promise<void> {
	if ((await readButtonCoverage(page)).watched > 0) return;
	const playlistUrl = page.url();
	const videoId = await page.evaluate((itemSelector) => {
		const link = document.querySelector<HTMLAnchorElement>(`${itemSelector} a[href*="watch?v="]`);
		return link ? new URL(link.href).searchParams.get("v") : null;
	}, PLAYLIST_ITEM_SELECTOR);
	expect(videoId).not.toBeNull();
	await navigateToPage(page, `https://www.youtube.com/watch?v=${videoId}`);
	await page.evaluate(async () => {
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		if (!video) return;
		video.muted = true;
		video.playbackRate = 2;
		await video.play().catch(() => {});
	});
	// YouTube reports the position to the account while the video plays and once more on leaving the page.
	await expect
		.poll(async () => page.evaluate(() => document.querySelector<HTMLVideoElement>("video.html5-main-video")?.currentTime ?? 0), {
			timeout: 40000
		})
		.toBeGreaterThan(20);
	await navigateToPage(page, playlistUrl);
	await expect
		.poll(
			async () => {
				const { watched } = await readButtonCoverage(page);
				if (watched === 0) await reloadPage(page, playlist);
				return watched;
			},
			{ intervals: [2000], timeout: 60000 }
		)
		.toBeGreaterThan(0);
}

async function expectButtonsRemoved(page: Page): Promise<void> {
	await expect(page.locator(REMOVE_BUTTON_SELECTOR)).not.toBeAttached();
	await expect(page.locator(RESET_BUTTON_SELECTOR)).not.toBeAttached();
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
		({ itemSelector, progressSelectors, removeButtonSelector, resetButtonSelector }) => {
			const items = Array.from(document.querySelectorAll(itemSelector));
			const isWatched = (item: Element) =>
				progressSelectors.some((selector) => {
					const progressBar = item.querySelector<HTMLElement>(selector);
					return !!progressBar && (parseFloat(progressBar.style.width) || 0) > 0;
				});
			const watched = items.filter(isWatched);
			return {
				items: items.length,
				itemsMissingRemoveButton: items.filter((item) => !item.querySelector(removeButtonSelector)).length,
				unwatchedWithResetButton: items.filter((item) => !isWatched(item) && item.querySelector(resetButtonSelector)).length,
				watched: watched.length,
				watchedMissingResetButton: watched.filter((item) => !item.querySelector(resetButtonSelector)).length
			};
		},
		{
			itemSelector: PLAYLIST_ITEM_SELECTOR,
			progressSelectors: PROGRESS_BAR_SELECTORS,
			removeButtonSelector: REMOVE_BUTTON_SELECTOR,
			resetButtonSelector: RESET_BUTTON_SELECTOR
		}
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
/** The watch progress of the row for `videoId`, read as the feature reads it, or null when the row is not on the page. */
async function readRowProgress(page: Page, videoId: string): Promise<null | number> {
	return page.evaluate(
		({ itemSelector, progressSelectors, videoId }) => {
			const row = Array.from(document.querySelectorAll(itemSelector)).find((item) =>
				Array.from(item.querySelectorAll<HTMLAnchorElement>("a[href*='watch?v=']")).some(
					(link) => new URL(link.href).searchParams.get("v") === videoId
				)
			);
			if (!row) return null;
			for (const selector of progressSelectors) {
				const bar = row.querySelector<HTMLElement>(selector);
				if (bar) return parseFloat(bar.style.width) || 0;
			}
			return 0;
		},
		{ itemSelector: PLAYLIST_ITEM_SELECTOR, progressSelectors: PROGRESS_BAR_SELECTORS, videoId }
	);
}
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
			test.setTimeout(180_000);
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await ensureWatchedPlaylistItem(page);
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectResetButtons(page);
		});

		test(`buttons should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			test.setTimeout(180_000);
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await ensureWatchedPlaylistItem(page);
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
			test.setTimeout(180_000);
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await ensureWatchedPlaylistItem(page);
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

	// Both cases below edit the account's Watch Later around the same video, so they run one after the other.
	test.describe("Watch Later", () => {
		test.describe.configure({ mode: "default" });
		test(`remove all watched videos button removes the fully watched videos from Watch Later on ${playlist}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			test.setTimeout(300_000);
			// The button lives in the chip bar, which regular playlists no longer render and Watch Later still does, and it
			// only appears once a video there is fully watched. The test makes that so itself: the short fixture video goes
			// into Watch Later through the extension's own toggle and is watched to the end at speed. The button then
			// removes every fully watched video from Watch Later, this one included, so the video is put back at the end.
			await ensureInWatchLater(page, WATCH_LATER_SHORT_VIDEO);
			await watchToTheEnd(page, WATCH_LATER_SHORT_VIDEO);
			await navigateToPageType(page, playlist, ["playlistChipBar"]);
			expect((await readRemoveAllState(page)).hasHeader).toBe(true);
			// YouTube records the position on its own schedule; the row is re-read after reloads until it shows the end.
			await expect
				.poll(
					async () => {
						const progress = await readRowProgress(page, WATCH_LATER_SHORT_VIDEO);
						if (progress !== 100) await reloadPage(page, playlist);
						return progress;
					},
					{ intervals: [3000], timeout: 90_000 }
				)
				.toBe(100);
			expect((await readRemoveAllState(page)).fullyWatched).toBeGreaterThanOrEqual(1);
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
			// The click removes the fully watched videos one request at a time; each row leaves the page as its removal
			// goes through, and with nothing watched left the feature takes its button away too.
			await removeAllButton.click();
			await expect.poll(async () => (await readRemoveAllState(page)).fullyWatched, { timeout: 60_000 }).toBe(0);
			expect(await readRowProgress(page, WATCH_LATER_SHORT_VIDEO)).toBeNull();
			await expect(removeAllButton).not.toBeAttached({ timeout: 10_000 });
			// A reload shows the removal held on the server: the row does not come back.
			await reloadPage(page, playlist);
			expect(await readRowProgress(page, WATCH_LATER_SHORT_VIDEO)).toBeNull();
			expect((await readRemoveAllState(page)).fullyWatched).toBe(0);
			await expect(removeAllButton).not.toBeAttached();
			await disableFeature(page, "playlistManagementButtons.removeAllButton.enabled");
			// Back into Watch Later for the next run.
			await ensureInWatchLater(page, WATCH_LATER_SHORT_VIDEO);
		});
		test(`reset and remove buttons act on a Watch Later row and the remove-all button follows on ${playlist}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			test.setTimeout(300_000);
			// The same self-contained set-up as above: the short video goes into Watch Later and is watched to the end, so
			// its row carries the reset button and counts for the remove-all button.
			await ensureInWatchLater(page, WATCH_LATER_SHORT_VIDEO);
			await watchToTheEnd(page, WATCH_LATER_SHORT_VIDEO);
			await navigateToPageType(page, playlist, ["playlistChipBar"]);
			await expect
				.poll(
					async () => {
						const progress = await readRowProgress(page, WATCH_LATER_SHORT_VIDEO);
						if (progress !== 100) await reloadPage(page, playlist);
						return progress;
					},
					{ intervals: [3000], timeout: 90_000 }
				)
				.toBe(100);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await enableFeature(page, "playlistManagementButtons.removeAllButton.enabled");
			const row = page.locator(PLAYLIST_ITEM_SELECTOR).filter({ has: page.locator(`a[href*="v=${WATCH_LATER_SHORT_VIDEO}"]`) });
			const removeAllButton = page.locator(REMOVE_ALL_BUTTON_SELECTOR);
			await expect(row.locator(RESET_BUTTON_SELECTOR)).toBeAttached({ timeout: 15000 });
			await expect(row.locator(REMOVE_BUTTON_SELECTOR)).toBeAttached();
			await expect(removeAllButton).toBeAttached({ timeout: 15000 });
			// Mark as unwatched: the click asks YouTube to drop the video from the watch history and takes the progress
			// overlay off the row. With no fully watched row left, the remove-all button goes with it.
			await row.locator(RESET_BUTTON_SELECTOR).click();
			await expect.poll(async () => readRowProgress(page, WATCH_LATER_SHORT_VIDEO), { timeout: 30_000 }).toBe(0);
			await expect(row.locator(RESET_BUTTON_SELECTOR)).not.toBeAttached({ timeout: 10_000 });
			await expect(removeAllButton).not.toBeAttached({ timeout: 15_000 });
			// The history edit holds on the server: after a reload the row is back without progress.
			await reloadPage(page, playlist);
			await expect.poll(async () => readRowProgress(page, WATCH_LATER_SHORT_VIDEO), { timeout: 30_000 }).toBe(0);
			// Remove: the row leaves the page as the request goes through, and stays gone across a reload.
			await expect(row.locator(REMOVE_BUTTON_SELECTOR)).toBeAttached({ timeout: 15000 });
			await row.locator(REMOVE_BUTTON_SELECTOR).click();
			await expect.poll(async () => readRowProgress(page, WATCH_LATER_SHORT_VIDEO), { timeout: 30_000 }).toBeNull();
			await reloadPage(page, playlist);
			expect(await readRowProgress(page, WATCH_LATER_SHORT_VIDEO)).toBeNull();
			await disableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await disableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await disableFeature(page, "playlistManagementButtons.removeAllButton.enabled");
			// Back into Watch Later for the next run.
			await ensureInWatchLater(page, WATCH_LATER_SHORT_VIDEO);
		});
	});

	test(`disabling only the remove button should keep the reset buttons on ${playlist}`, async ({ page }) => {
		test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
		test.setTimeout(180_000);
		await navigateToPageType(page, playlist, ["playlistManagementButtons"]);
		await ensureWatchedPlaylistItem(page);
		await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
		await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
		await expectRemoveButtons(page);
		await expectResetButtons(page);
		// The feature stays enabled, so this runs onConfigChange, which strips both button classes before it
		// rebuilds. The reset buttons have to come back from that rebuild.
		await disableFeature(page, "playlistManagementButtons.removeButton.enabled");
		await expect(page.locator(REMOVE_BUTTON_SELECTOR)).not.toBeAttached({ timeout: 10000 });
		await expectResetButtons(page, 15000);
		await expectToStay(async () => page.locator(REMOVE_BUTTON_SELECTOR).count(), 0, { page });
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
