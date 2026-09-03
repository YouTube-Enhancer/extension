import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { Nullable } from "@/src/types";

import { metadata } from "@/src/features/playlistLength/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const pageTypes = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { playlist, watch } = pageTypeRecord;
const UI = {
	percent: "#yte-playlist-length-ui-percentageWatched",
	root: "#yte-playlist-length-ui",
	times: "#yte-playlist-length-ui-times"
} as const;
/** The containers the playlist-page controller reads its items from. */
const PLAYLIST_ITEMS_SELECTOR = "ytd-playlist-video-list-renderer div#contents, yt-item-section-renderer div#contents";
const PLAYLIST_ITEM_SELECTOR = "ytd-playlist-video-list-renderer div#contents > *, yt-item-section-renderer div#contents > *";
/** The UI only counts as rebuilt for a watch page when it lands in the watch layout's playlist header. */
const WATCH_UI_SELECTOR = [
	`#page-manager > ytd-watch-flexy #playlist #header-contents ${UI.root}`,
	`#page-manager > ytd-watch-grid #playlist #header-contents ${UI.root}`
].join(", ");

async function enablePlaylistLength(page: Page, pageType: string): Promise<void> {
	await waitForPlaylist(page, pageType);
	await disableFeature(page, "playlistLength.enabled");
	await enableFeature(page, "playlistLength.enabled");
}

async function expectUIHidden(page: Page): Promise<void> {
	await expect(page.locator(UI.root)).toHaveCount(0);
}

async function expectUIVisible(page: Page): Promise<void> {
	await expect(page.locator(UI.root)).toBeVisible({ timeout: 15000 });
	await expect(page.locator(UI.times)).not.toHaveText("");
	await expect(page.locator(UI.percent)).toContainText("%");
}

async function getTimes(page: Page): Promise<Nullable<string>> {
	return await page.locator(UI.times).textContent();
}
/** Reads the total segment of `watched / total (- remaining)` in seconds. */
async function getTotalSeconds(page: Page): Promise<Nullable<number>> {
	const times = await getTimes(page);
	const total = times?.split(" / ")[1]?.split(" (")[0];
	if (!total) return null;
	return toSeconds(total);
}
/** Reads the watched segment of `watched / total (- remaining)` in seconds. */
async function getWatchedSeconds(page: Page): Promise<Nullable<number>> {
	const times = await getTimes(page);
	const [watched] = times?.split(" / ") ?? [];
	if (!watched) return null;
	return toSeconds(watched);
}
/** Reads the three values the UI derives from the same state in one go, so they cannot drift between polls. */
async function readUISnapshot(page: Page) {
	return page.evaluate(
		([percentSelector, progressBarSelector, timesSelector]) => {
			const times = document.querySelector(timesSelector)?.textContent;
			if (!times) return null;
			return {
				percent: document.querySelector(percentSelector)?.textContent ?? "",
				progressBarWidth: document.querySelector<HTMLElement>(progressBarSelector)?.style.width ?? "",
				times
			};
		},
		[UI.percent, "#yte-playlist-length-ui-watchedProgressBar", UI.times] as const
	);
}
/** Single-page navigation from a playlist page to its first video, so the controller's onNavigate runs. */
async function spaNavigateToFirstPlaylistVideo(page: Page): Promise<void> {
	const link = page
		.locator(
			'ytd-playlist-video-renderer a#video-title[href^="/watch?v="], ytd-playlist-video-renderer a#thumbnail[href^="/watch?v="], a.ytLockupViewModelContentImage[href^="/watch?v="]'
		)
		.first();
	await expect(link).toBeAttached({ timeout: 15000 });
	await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
	await link.click();
	await page.waitForURL((url) => url.pathname === "/watch", { timeout: 30000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
}
function toSeconds(value: string): number {
	return value.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}

async function waitForPlaylist(page: Page, pageType: string): Promise<void> {
	if (pageType !== "playlist") return;
	// The containers the controller reads its items from. Awaiting them replaces a swallowed selector
	// timeout followed by an unconditional 2 s sleep.
	await expect(page.locator(PLAYLIST_ITEM_SELECTOR).first()).toBeVisible({
		timeout: 15000
	});
}

test.describe("playlistLength", () => {
	for (const pageType of pageTypes) {
		test(`should render UI when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await enablePlaylistLength(page, pageType);
			await expectUIVisible(page);
		});
		test(`should not render UI when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await disableFeature(page, "playlistLength.enabled");
			await expectUIHidden(page);
		});
		test(`should re-enable UI after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await enablePlaylistLength(page, pageType);
			await expectUIVisible(page);
			await disableFeature(page, "playlistLength.enabled");
			await expectUIHidden(page);
			await enableFeature(page, "playlistLength.enabled");
			await expectUIVisible(page);
		});
		test(`should persist UI after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await enablePlaylistLength(page, pageType);
			await expectUIVisible(page);
			await page.reload();
			// navigateToPageType only performs the readiness/ads wait here; re-enabling would replace the
			// reloaded state with a fresh onEnable and hide a broken reload path.
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await expectUIVisible(page);
		});
	}
	test("should update UI when playback rate changes (watch only behavior)", async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistLength.enabled");
		await expectUIVisible(page);
		const totalBefore = await getTotalSeconds(page);
		expect(totalBefore).toBeTruthy();
		// The watched time advances on its own, so only the total (playlist duration / playbackRate) is a
		// valid observation. The video keeps playing so the timeupdate listener drives the recomputation.
		await page.locator("video").evaluate(async (video: HTMLVideoElement) => {
			video.playbackRate = 2;
			await video.play().catch(() => {});
		});
		await expect.poll(async () => getTotalSeconds(page), { timeout: 15000 }).toBeCloseTo(Math.floor(totalBefore! / 2), -1);
	});

	test(`should compute a larger watched time with watchTimeGetMethod "duration" than "youtube" on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		// Freezing playback keeps getCurrentVideoTime(), which both methods add, out of the comparison.
		await page.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
		await setOption(page, "playlistLength.watchTimeGetMethod", "duration");
		await enablePlaylistLength(page, watch);
		await expectUIVisible(page);
		const watchedWithDuration = await getWatchedSeconds(page);
		expect(watchedWithDuration).toBeGreaterThan(0);
		// "youtube" only counts the progress YouTube reports per item, which can never exceed the full durations
		// the "duration" method sums - so a ternary that ignores the setting collapses these two into one value.
		await setOption(page, "playlistLength.watchTimeGetMethod", "youtube");
		await expect.poll(async () => getWatchedSeconds(page), { timeout: 20000 }).toBeLessThan(watchedWithDuration!);
	});
	test(`should use the InnerTube API for a non-uploads playlist on ${playlist}`, async ({ page }) => {
		// The default playlist fixture is a "UU" uploads playlist, for which getDurationFromAPI throws outright
		// and the controller silently falls back to summing the rendered rows.
		await navigateToPageType(page, playlist, ["playlistLength", "playlistManagementButtons"]);
		await setOption(page, "playlistLength.lengthGetMethod", "api");
		await enablePlaylistLength(page, playlist);
		await expectUIVisible(page);
		const apiTotal = await getTotalSeconds(page);
		expect(apiTotal).toBeGreaterThan(0);
		const renderedItems = page.locator(PLAYLIST_ITEM_SELECTOR);
		const renderedBefore = await renderedItems.count();
		expect(renderedBefore).toBeGreaterThan(5);
		// Dropping rendered rows must not move the total: the API walks the playlist server-side, while the html
		// fallback only ever sums what the page happens to have rendered.
		await page.evaluate((selector) => {
			const container = document.querySelector(selector);
			Array.from(container?.children ?? [])
				.slice(0, 5)
				.forEach((child) => child.remove());
		}, PLAYLIST_ITEMS_SELECTOR);
		await expect.poll(async () => renderedItems.count(), { timeout: 5000 }).toBeLessThan(renderedBefore);
		await expectToStay(async () => getTotalSeconds(page), apiTotal, { durationMs: 5000, page });
	});
	test(`should rebuild the UI after SPA navigation from ${playlist} to ${watch}`, async ({ page }) => {
		await navigateToPageType(page, playlist, ["playlistLength"]);
		await enablePlaylistLength(page, playlist);
		await expectUIVisible(page);
		// A genuine in-document navigation is the only path that reaches onNavigate; every helper navigation
		// used by the cases above tears the document down and runs onEnable instead.
		await spaNavigateToFirstPlaylistVideo(page);
		// The controller has to be rebuilt for the watch layout, whose header is a different element entirely.
		await expect(page.locator(WATCH_UI_SELECTOR)).toBeVisible({ timeout: 20000 });
		await expect(page.locator(UI.times)).not.toHaveText("");
		await expect(page.locator(UI.percent)).toContainText("%");
	});
	test(`should show consistent times, percentage and progress-bar width on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enablePlaylistLength(page, watch);
		await expectUIVisible(page);
		const snapshot = await readUISnapshot(page);
		expect(snapshot).not.toBeNull();
		const [watchedText, rest] = snapshot!.times.split(" / ");
		const [totalText, remainingText] = (rest ?? "").split(" (- ");
		const watched = toSeconds(watchedText);
		const total = toSeconds(totalText);
		const remaining = toSeconds((remainingText ?? "").replace(")", ""));
		// "0:00 / 0:00 (- 0:00)" plus "0%" satisfies the non-empty/contains-% checks the other cases make, so a
		// total failure to read the playlist is only caught by requiring a real duration here.
		expect(total).toBeGreaterThan(0);
		expect(remaining).toBe(total - watched);
		const expectedPercentage = Math.floor((watched / total) * 100);
		expect(snapshot!.percent).toBe(`${expectedPercentage}%`);
		expect(snapshot!.progressBarWidth).toBe(`${expectedPercentage}%`);
	});
	test(`should not render the UI on a ${watch} page without a playlist`, async ({ page }) => {
		// The videoHistory fixture is a plain /watch URL with no list parameter.
		await navigateToPageType(page, watch, ["videoHistory"]);
		await disableFeature(page, "playlistLength.enabled");
		await enableFeature(page, "playlistLength.enabled");
		// watch is inside includePages, so the feature does run here - the header it waits for simply never
		// appears. The window outlasts both 2500 ms element waits the controller performs before giving up.
		await expectToStay(async () => page.locator(UI.root).count(), 0, { durationMs: 8000, page });
	});
	test(`should re-render the UI when lengthGetMethod changes while enabled on ${playlist}`, async ({ page }) => {
		await navigateToPageType(page, playlist, ["playlistLength"]);
		await setOption(page, "playlistLength.lengthGetMethod", "html");
		await enablePlaylistLength(page, playlist);
		await expectUIVisible(page);
		// Tagging the current element proves onConfigChange rebuilt it instead of leaving the old one in place.
		await page.evaluate((selector) => document.querySelector(selector)?.setAttribute("data-test-generation", "first"), UI.root);
		await setOption(page, "playlistLength.lengthGetMethod", "api");
		await expect(page.locator(`${UI.root}:not([data-test-generation])`)).toBeVisible({ timeout: 20000 });
		await expectUIVisible(page);
	});

	test("should not render UI on non-target page", async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await disableFeature(page, "playlistLength.enabled");
		await enableFeature(page, "playlistLength.enabled");
		await expect(page.locator(UI.root)).toHaveCount(0);
	});
});
