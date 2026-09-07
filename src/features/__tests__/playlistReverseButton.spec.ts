import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { ManagerElement, PanelElement, WatchFlexyElement } from "@/src/features/playlistReverseButton/utils";
import type { Nullable, YouTubePlayerDiv } from "@/src/types";
import type { FixtureCapabilities } from "@/src/utils/_tests/navigation";

import { REVERSE_BUTTON_CONTAINER_ID, REVERSE_BUTTON_ID } from "@/src/features/playlistReverseButton/constants";
import { metadata } from "@/src/features/playlistReverseButton/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { localeText } from "@/src/utils/_tests/locale";
import { navigateToPage, navigateToPageType, reloadPage, spaNavigateBack, waitForExtensionReady } from "@/src/utils/_tests/navigation";
import { pageSetup } from "@/src/utils/_tests/pageSetup";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { readStoredOptions, readStoredState } from "@/src/utils/_tests/storage";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const playlistRequirements: FixtureCapabilities[] = ["playlistLength", "playlistManagementButtons"];
const { below } = placementRecord;
const { playlist, watch } = pageTypeRecord;

type AutoplayTarget = Nullable<{ playlistId: Nullable<string>; videoId: Nullable<string> }>;

type LivePlaylist = {
	currentIndex: number;
	firstIndex: number;
	lastIndex: number;
	length: number;
	lengths: number[];
	localCurrentIndex: number;
	selectedVideoId: Nullable<string>;
	totalVideos: number;
	videoIds: string[];
};

async function getPlaylistOrder(page: Parameters<typeof navigateToPageType>[0]): Promise<string[]> {
	return await page.evaluate(() => {
		const items = document.querySelectorAll<HTMLAnchorElement>("ytd-playlist-panel-video-renderer a#thumbnail");
		if (items.length > 0) {
			return Array.from(items).map((a) => {
				const url = new URL(a.href);
				return url.searchParams.get("v") ?? "";
			});
		}
		const playlistId = new URLSearchParams(window.location.search).get("list");
		if (!playlistId) return [];
		const fallbackItems = document.querySelectorAll<HTMLAnchorElement>(`#playlist a[href*="list=${playlistId}"]`);
		return Array.from(fallbackItems).map((a) => {
			const url = new URL(a.href);
			return url.searchParams.get("v") ?? "";
		});
	});
}

async function getPlaylistPageOrder(page: Parameters<typeof navigateToPageType>[0]): Promise<string[]> {
	return await page.evaluate(() => {
		// Scoped to the list the feature reverses: an owned playlist also shows suggested videos in rows of the same kind below it.
		const items = document.querySelectorAll<HTMLAnchorElement>(
			"ytd-playlist-video-list-renderer div#contents > ytd-playlist-video-renderer a#thumbnail"
		);
		return Array.from(items).map((a) => {
			const url = new URL(a.href);
			return url.searchParams.get("v") ?? "";
		});
	});
}

/** Reads the video id and panel position of the item YouTube currently marks as playing. */
async function getSelectedPanelPosition(page: Page): Promise<Nullable<{ index: number; total: number; videoId: string }>> {
	return await page.evaluate(() => {
		const items = Array.from(document.querySelectorAll<HTMLElement>("ytd-playlist-panel-video-renderer"));
		const index = items.findIndex((item) => item.hasAttribute("selected"));
		if (index === -1) return null;
		const anchor = items[index].querySelector<HTMLAnchorElement>("a#thumbnail");
		if (!anchor) return null;
		const videoId = new URL(anchor.href).searchParams.get("v");
		if (!videoId) return null;
		return { index, total: items.length, videoId };
	});
}

/** Whether the live playlist data runs backwards, the way the feature itself tells: null while there is no data. */
async function isLiveOrderReversed(page: Page): Promise<Nullable<boolean>> {
	const live = await readLivePlaylist(page);
	return live ? live.firstIndex > live.lastIndex : null;
}

/** Scrolls the playlist page's continuation trigger into view until every row is loaded, as a reader scrolling down would. */
async function loadAllPlaylistRows(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const rows = () => document.querySelectorAll("ytd-playlist-video-list-renderer ytd-playlist-video-renderer").length;
		for (let round = 0; round < 50; round++) {
			const trigger = document.querySelector<HTMLElement>("ytd-playlist-video-list-renderer div#contents > ytd-continuation-item-renderer");
			if (!trigger) return;
			const before = rows();
			trigger.scrollIntoView({ block: "center" });
			const start = Date.now();
			while (rows() === before && document.querySelector("ytd-continuation-item-renderer") !== null && Date.now() - start < 10000) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
	});
	await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * Opens a playlist video a few seconds before its end as a fresh page and waits for the extension and the player.
 * Opening at a position is how a far position is reached on this profile, which does not seek outside what the
 * player has buffered (see the status notes).
 */
async function openVideoNearEnd(page: Page, videoId: string, playlistId: string, lengthSeconds: number): Promise<void> {
	const start = Math.max(0, lengthSeconds - 8);
	await navigateToPage(page, `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}&t=${start}s`);
	await waitForExtensionReady(page);
	await waitForPlayerToReport(page, videoId);
	await pageSetup(page);
}

/**
 * Plays the video out and waits for YouTube to move on to another video on its own, as it does at the end of a
 * playlist video. A video that is not already near its end is seeked there first; that is fine for the fixture video,
 * which is short and fully preloaded, while the other legs open their video near its end instead.
 */
async function playToEndAndAwaitAutoplay(page: Page, videoId: string): Promise<void> {
	await expect
		.poll(
			async () =>
				page.evaluate(async (videoId) => {
					if (new URLSearchParams(window.location.search).get("v") !== videoId) return "moved on";
					const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
					const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
					if (!player || !video) return "no player";
					const data = await player.getVideoData();
					if (data.video_id !== videoId || player.classList.contains("ad-showing")) return "not the video yet";
					video.muted = true;
					const { currentTime, duration, seeking } = video;
					if (Number.isFinite(duration) && duration > 0 && duration - currentTime > 8 && !seeking) await player.seekTo(duration - 4, true);
					if (video.paused && !video.ended) await video.play().catch(() => {});
					return video.ended || (duration > 0 && video.currentTime >= duration - 0.25) ? "moved on" : `at ${Math.round(video.currentTime)}s`;
				}, videoId),
			{ intervals: [500], timeout: 60_000 }
		)
		.toBe("moved on");
	await page.waitForURL((url) => url.searchParams.get("v") !== videoId, { timeout: 30_000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
	await waitForPlayerToReport(page, new URL(page.url()).searchParams.get("v") ?? "");
	await pageSetup(page);
}

/**
 * The entries of one of the playlist manager's autoplay sets, reduced to the video and playlist each points at:
 * `autoplay` is where a finished video goes, `next` and `previous` where the player's buttons go. An entry without a
 * watch endpoint, like YouTube's "restart the playlist" link in the loop set, reads as absent.
 */
async function readAutoplaySet(
	page: Page,
	mode: "LOOP" | "NORMAL" = "NORMAL"
): Promise<Nullable<{ autoplay: AutoplayTarget; next: AutoplayTarget; previous: AutoplayTarget }>> {
	return await page.evaluate((mode) => {
		const manager = document.querySelector<ManagerElement>("yt-playlist-manager");
		const set = manager?.autoplayData?.sets.find((candidate) => candidate.mode === mode);
		if (!set) return null;
		const targetOf = (endpoint: (typeof set)["autoplayVideo"]) =>
			endpoint?.watchEndpoint ? { playlistId: endpoint.watchEndpoint.playlistId ?? null, videoId: endpoint.watchEndpoint.videoId ?? null } : null;
		return { autoplay: targetOf(set.autoplayVideo), next: targetOf(set.nextButtonVideo), previous: targetOf(set.previousButtonVideo) };
	}, mode);
}

async function readIsReversedState(page: Page): Promise<boolean | undefined> {
	const storedState = await readStoredState(page);
	return (storedState.playlistReverseButton as undefined | { isReversed: boolean })?.isReversed;
}

/**
 * Reads the playlist data the feature works on: the panel's live data first, since that is what YouTube's playlist
 * manager and player follow, the page data otherwise. `firstIndex`/`lastIndex` are the playlist positions of the
 * first and last loaded videos, which is how the feature itself recognises an already reversed list; `videoIds` and
 * `lengths` (in seconds) follow the loaded order.
 */
async function readLivePlaylist(page: Page): Promise<Nullable<LivePlaylist>> {
	return await page.evaluate(() => {
		const watchFlexy = document.querySelector<WatchFlexyElement>("ytd-watch-flexy, ytd-watch-grid");
		const panel =
			watchFlexy?.querySelector<PanelElement>("ytd-playlist-panel-renderer#playlist") ??
			document.querySelector<PanelElement>("ytd-playlist-panel-renderer");
		const panelData = panel?.data;
		const playlistData = panelData?.contents?.length ? panelData : watchFlexy?.data?.contents?.twoColumnWatchNextResults?.playlist?.playlist;
		if (!playlistData?.contents.length) return null;
		const { contents, currentIndex, localCurrentIndex, totalVideos } = playlistData;
		const videos = contents.flatMap((item) => (item.playlistPanelVideoRenderer ? [item.playlistPanelVideoRenderer] : []));
		const [first] = videos;
		const last = videos.at(-1);
		if (!first || !last) return null;
		const positionOf = (video: typeof first) => video.navigationEndpoint?.watchEndpoint?.index ?? -1;
		const secondsOf = (video: typeof first) => {
			const text = (video as { lengthText?: { simpleText?: string } }).lengthText?.simpleText;
			if (!text) return 0;
			return text.split(":").reduce((total, part) => total * 60 + Number.parseInt(part, 10), 0);
		};
		return {
			currentIndex,
			firstIndex: positionOf(first),
			lastIndex: positionOf(last),
			length: contents.length,
			lengths: videos.map(secondsOf),
			localCurrentIndex,
			selectedVideoId: videos.find((video) => video.selected)?.videoId ?? null,
			totalVideos,
			videoIds: videos.map((video) => video.videoId ?? "")
		};
	});
}

/**
 * Clicks another video in the watch page playlist panel. That is a genuine in-page navigation which keeps the
 * playlist attached, so the feature's onNavigate hook runs instead of a fresh document load.
 */
async function spaNavigateToOtherPlaylistVideo(page: Page): Promise<void> {
	const videoId = new URL(page.url()).searchParams.get("v");
	const link = page.locator(`ytd-playlist-panel-video-renderer a#thumbnail:not([href*="v=${videoId}"])`).first();
	await expect(link).toBeAttached({ timeout: 15_000 });
	await link.evaluate((element) => element.scrollIntoView({ block: "center" }));
	await link.click();
	await page.waitForURL((url) => url.searchParams.get("v") !== videoId, { timeout: 30_000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
	await waitForYoutubePlayerReady(page, "watch");
}

/** Waits until the player has switched to the given video, ads aside. */
async function waitForPlayerToReport(page: Page, videoId: string): Promise<void> {
	await expect
		.poll(
			async () =>
				page.evaluate(async (videoId) => {
					const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
					if (!player) return false;
					const data = await player.getVideoData();
					return data.video_id === videoId;
				}, videoId),
			{ timeout: 30_000 }
		)
		.toBe(true);
}

test.describe("playlistReverseButton", () => {
	for (const pageType of testPages) {
		if (pageType === "watch") {
			test(`reverse button should be present when enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator(`#${REVERSE_BUTTON_ID}`)).toBeAttached({ timeout: 10000 });
				await expect(page.locator(`#${REVERSE_BUTTON_CONTAINER_ID}`)).toBeAttached({ timeout: 5000 });
			});
			test(`should reverse playlist order on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator(`#${REVERSE_BUTTON_ID}`);
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				// Compare the whole array: a rotation, a swap or a partial reversal must not pass as a reversal.
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
			});
			test(`should maintain reversed order after disable then re-enable on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator(`#${REVERSE_BUTTON_ID}`);
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(button).not.toBeAttached();
				await expect(page.locator(`#${REVERSE_BUTTON_CONTAINER_ID}`)).not.toBeAttached();
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(before);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
			});
			test(`should persist reversed order after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator(`#${REVERSE_BUTTON_ID}`);
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
				await reloadPage(page, pageType);
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 15000 }).toEqual(reversed);
			});
		} else {
			test(`reverse button should be present when enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator(`#${REVERSE_BUTTON_ID}`)).toBeAttached({ timeout: 10000 });
			});
			test(`should reverse playlist order on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator(`#${REVERSE_BUTTON_ID}`);
				await expect(button).toBeAttached({ timeout: 10000 });
				// The whole list is loaded first, so the order captured here is the playlist's and not its first page.
				await loadAllPlaylistRows(page);
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 20000 }).toEqual([...before].reverse());
				await expect
					.poll(
						async () => {
							const storedState = await readStoredState(page);
							return (storedState.playlistReverseButton as undefined | { isReversed: boolean })?.isReversed;
						},
						{ timeout: 10000 }
					)
					.toBe(true);
			});
			test(`should maintain reversed order after disable then re-enable on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator(`#${REVERSE_BUTTON_ID}`);
				await expect(button).toBeAttached({ timeout: 10000 });
				await loadAllPlaylistRows(page);
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 20000 }).toEqual(reversed);
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(button).not.toBeAttached();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 20000 }).toEqual(before);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 20000 }).toEqual(reversed);
			});
			test(`should persist reversed order after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator(`#${REVERSE_BUTTON_ID}`);
				await expect(button).toBeAttached({ timeout: 10000 });
				await loadAllPlaylistRows(page);
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 20000 }).toEqual(reversed);
				// After the reload the feature has to fetch every page itself before it can turn the list over.
				await reloadPage(page, pageType);
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 30000 }).toEqual(reversed);
			});
		}
	}

	test(`reversed order survives an in-page navigation to another playlist video on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator(`#${REVERSE_BUTTON_ID}`);
		await expect(button).toBeAttached({ timeout: 10000 });
		const before = await getPlaylistOrder(page);
		expect(before.length).toBeGreaterThan(1);
		await button.click();
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
		const videoIdBefore = new URL(page.url()).searchParams.get("v");
		await spaNavigateToOtherPlaylistVideo(page);
		expect(new URL(page.url()).searchParams.get("v")).not.toBe(videoIdBefore);
		// YouTube reloads the panel for the new video and the loaded window can shift, so the surviving reversal is
		// read from the playlist data (the first loaded item sits after the last one) instead of from the DOM order.
		await expect.poll(async () => isLiveOrderReversed(page), { timeout: 20000 }).toBe(true);
		await expect(button).toBeAttached({ timeout: 15000 });
		await expect.poll(async () => readIsReversedState(page), { timeout: 10000 }).toBe(true);
	});

	test(`autoplay from the playlist's last video follows the reversed order and stays in the playlist on ${watch}`, async ({ page }) => {
		test.setTimeout(240_000);
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator(`#${REVERSE_BUTTON_ID}`);
		await expect(button).toBeAttached({ timeout: 10000 });
		const playlistId = new URL(page.url()).searchParams.get("list");
		const startId = new URL(page.url()).searchParams.get("v");
		expect(playlistId).not.toBeNull();
		expect(startId).not.toBeNull();
		const before = await getPlaylistOrder(page);
		expect(before.length).toBeGreaterThan(2);
		await button.click();
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
		const reversed = await readLivePlaylist(page);
		expect(reversed).not.toBeNull();
		const position = reversed!.videoIds.indexOf(startId!);
		expect(position).toBeGreaterThanOrEqual(0);
		expect(position).toBeLessThan(reversed!.videoIds.length - 1);
		const expectedNext = reversed!.videoIds.at(position + 1)!;
		// Where the playlist manager sends a finished video: the next video of the reversed order, inside the playlist.
		// For the fixture video, the playlist's last, YouTube's own entry is a radio outside the playlist.
		await expect.poll(async () => readAutoplaySet(page), { timeout: 10000 }).toMatchObject({ autoplay: { playlistId, videoId: expectedNext } });
		await playToEndAndAwaitAutoplay(page, startId!);
		const landed = new URL(page.url());
		expect(landed.searchParams.get("v")).toBe(expectedNext);
		expect(landed.searchParams.get("list")).toBe(playlistId);
		// The new page's playlist is turned over again once YouTube's data for it arrives, the playing video is the one
		// YouTube marks, the button is back and the state still says reversed.
		await expect.poll(async () => (await readLivePlaylist(page))?.selectedVideoId, { timeout: 20000 }).toBe(expectedNext);
		await expect.poll(async () => isLiveOrderReversed(page), { timeout: 20000 }).toBe(true);
		await expect(button).toBeAttached({ timeout: 15000 });
		await expect.poll(async () => readIsReversedState(page), { timeout: 10000 }).toBe(true);
		// And the next hand-over is lined up the same way.
		const second = await readLivePlaylist(page);
		const secondPosition = second!.videoIds.indexOf(expectedNext);
		expect(secondPosition).toBeGreaterThanOrEqual(0);
		expect(secondPosition).toBeLessThan(second!.videoIds.length - 1);
		await expect
			.poll(async () => readAutoplaySet(page), { timeout: 10000 })
			.toMatchObject({ autoplay: { playlistId, videoId: second!.videoIds[secondPosition + 1] } });
	});

	test(`reversed playlist videos opened near their end autoplay on through the reversed order on ${watch}`, async ({ page }) => {
		test.setTimeout(300_000);
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator(`#${REVERSE_BUTTON_ID}`);
		await expect(button).toBeAttached({ timeout: 10000 });
		const playlistId = new URL(page.url()).searchParams.get("list");
		expect(playlistId).not.toBeNull();
		const before = await getPlaylistOrder(page);
		expect(before.length).toBeGreaterThan(3);
		await button.click();
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
		let current = new URL(page.url()).searchParams.get("v")!;
		let live = (await readLivePlaylist(page))!;
		// Two legs, each a fresh page: the reversal has to come from the stored state, then the finished video has to
		// hand over to the next one of the reversed order, and that page has to be turned over as well.
		for (let leg = 0; leg < 2; leg++) {
			const position = live.videoIds.indexOf(current);
			expect(position).toBeGreaterThanOrEqual(0);
			expect(position).toBeLessThan(live.videoIds.length - 1);
			const opened = live.videoIds.at(position + 1)!;
			const openedLength = live.lengths.at(position + 1) ?? 0;
			expect(openedLength).toBeGreaterThan(10);
			await openVideoNearEnd(page, opened, playlistId!, openedLength);
			await expect.poll(async () => (await readLivePlaylist(page))?.selectedVideoId, { timeout: 20000 }).toBe(opened);
			await expect.poll(async () => isLiveOrderReversed(page), { timeout: 20000 }).toBe(true);
			live = (await readLivePlaylist(page))!;
			const openedPosition = live.videoIds.indexOf(opened);
			expect(openedPosition).toBeLessThan(live.videoIds.length - 1);
			const following = live.videoIds.at(openedPosition + 1)!;
			await expect.poll(async () => readAutoplaySet(page), { timeout: 10000 }).toMatchObject({ autoplay: { playlistId, videoId: following } });
			await playToEndAndAwaitAutoplay(page, opened);
			const landed = new URL(page.url());
			expect(landed.searchParams.get("v")).toBe(following);
			expect(landed.searchParams.get("list")).toBe(playlistId);
			await expect.poll(async () => (await readLivePlaylist(page))?.selectedVideoId, { timeout: 20000 }).toBe(following);
			await expect.poll(async () => isLiveOrderReversed(page), { timeout: 20000 }).toBe(true);
			await expect(button).toBeAttached({ timeout: 15000 });
			current = following;
			live = (await readLivePlaylist(page))!;
		}
	});

	test(`the player's next and previous controls follow the reversed order on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator(`#${REVERSE_BUTTON_ID}`);
		await expect(button).toBeAttached({ timeout: 10000 });
		const playlistId = new URL(page.url()).searchParams.get("list");
		const startId = new URL(page.url()).searchParams.get("v")!;
		const before = await getPlaylistOrder(page);
		expect(before.length).toBeGreaterThan(2);
		await button.click();
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
		const live = (await readLivePlaylist(page))!;
		const position = live.videoIds.indexOf(startId);
		expect(position).toBeGreaterThanOrEqual(0);
		expect(position).toBeLessThan(live.videoIds.length - 1);
		const expectedNext = live.videoIds.at(position + 1)!;
		const wholePlaylistLoaded = live.totalVideos <= live.videoIds.length;
		const expectedPrevious = position > 0 ? live.videoIds[position - 1] : null;
		// Next and autoplay lead to the next video of the reversed order and previous to the one before it, or nowhere
		// at the reversed start; never out of the playlist (YouTube's own set for the playlist's last video points next
		// and autoplay at a radio). The loop set only wraps around when the whole playlist is loaded.
		await expect
			.poll(async () => readAutoplaySet(page), { timeout: 10000 })
			.toEqual({
				autoplay: { playlistId, videoId: expectedNext },
				next: { playlistId, videoId: expectedNext },
				previous: expectedPrevious === null ? null : { playlistId, videoId: expectedPrevious }
			});
		const loopPrevious = expectedPrevious ?? (wholePlaylistLoaded ? (live.videoIds.at(-1) ?? null) : null);
		await expect
			.poll(async () => readAutoplaySet(page, "LOOP"), { timeout: 10000 })
			.toEqual({
				autoplay: { playlistId, videoId: expectedNext },
				next: { playlistId, videoId: expectedNext },
				previous: loopPrevious === null ? null : { playlistId, videoId: loopPrevious }
			});
		await page.locator(".ytp-next-button").evaluate((element) => (element as HTMLElement).click());
		await page.waitForURL((url) => url.searchParams.get("v") !== startId, { timeout: 30_000 });
		const landed = new URL(page.url());
		expect(landed.searchParams.get("v")).toBe(expectedNext);
		expect(landed.searchParams.get("list")).toBe(playlistId);
		await expect(page.locator("html[yte-ready]")).toBeAttached();
		await waitForPlayerToReport(page, expectedNext);
		await pageSetup(page);
		await expect.poll(async () => (await readLivePlaylist(page))?.selectedVideoId, { timeout: 20000 }).toBe(expectedNext);
		await expect.poll(async () => isLiveOrderReversed(page), { timeout: 20000 }).toBe(true);
		// From here the previous control leads back to where the click came from.
		await expect.poll(async () => readAutoplaySet(page), { timeout: 15000 }).toMatchObject({ previous: { playlistId, videoId: startId } });
		await expect(button).toBeAttached({ timeout: 15000 });
	});

	test(`the reversed order is restored when YouTube hands the panel its own data again on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator(`#${REVERSE_BUTTON_ID}`);
		await expect(button).toBeAttached({ timeout: 10000 });
		const playlistId = new URL(page.url()).searchParams.get("list");
		const startId = new URL(page.url()).searchParams.get("v")!;
		const before = await getPlaylistOrder(page);
		expect(before.length).toBeGreaterThan(2);
		const reversed = [...before].reverse();
		await button.click();
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
		const live = (await readLivePlaylist(page))!;
		const position = live.videoIds.indexOf(startId);
		const reversedNext = live.videoIds.at(position + 1)!;
		await expect.poll(async () => readAutoplaySet(page), { timeout: 10000 }).toMatchObject({ autoplay: { playlistId, videoId: reversedNext } });
		// Stand in for YouTube reloading its own copy of the playlist, as it does after a navigation, when more of a
		// long playlist arrives or when the queue or the miniplayer changes: the panel and the playlist manager are
		// handed forward data, the autoplay set is rebuilt from it, and the hand-over is announced.
		await page.evaluate(() => {
			const watchFlexy = document.querySelector<WatchFlexyElement>("ytd-watch-flexy, ytd-watch-grid");
			const panel = watchFlexy?.querySelector<PanelElement>("ytd-playlist-panel-renderer#playlist");
			const manager = document.querySelector<ManagerElement>("yt-playlist-manager");
			if (!panel?.data || !manager?.autoplayData || !manager.setPlaylistData) throw new Error("no playlist panel or manager to hand data to");
			const forward = JSON.parse(JSON.stringify(panel.data)) as NonNullable<typeof panel.data>;
			forward.contents.reverse();
			forward.localCurrentIndex = forward.contents.length - 1 - forward.localCurrentIndex;
			forward.currentIndex = (forward.yteWindowOffset ?? 0) + forward.localCurrentIndex;
			delete forward.yteWindowOffset;
			const endpointAt = (index: number) => forward.contents[index]?.playlistPanelVideoRenderer?.navigationEndpoint;
			const next = endpointAt(forward.localCurrentIndex + 1);
			const previous = endpointAt(forward.localCurrentIndex - 1);
			const autoplay = JSON.parse(JSON.stringify(manager.autoplayData)) as NonNullable<typeof manager.autoplayData>;
			for (const set of autoplay.sets) {
				if (set.mode !== "NORMAL") continue;
				delete set.autoplayVideo;
				delete set.nextButtonVideo;
				delete set.previousButtonVideo;
				if (next) {
					set.autoplayVideo = next;
					set.nextButtonVideo = next;
				}
				if (previous) set.previousButtonVideo = previous;
			}
			manager.autoplayData = autoplay;
			panel.data = forward;
			manager.setPlaylistData(forward);
		});
		// The feature answers the announcement: the order, the hand-over target and the button are all as before, and stay so.
		await expect.poll(async () => readAutoplaySet(page), { timeout: 15000 }).toMatchObject({ autoplay: { playlistId, videoId: reversedNext } });
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 15000 }).toEqual(reversed);
		await expectToStay(async () => getPlaylistOrder(page), reversed, { durationMs: 3000, page });
		expect(await isLiveOrderReversed(page)).toBe(true);
		await expect(button).toBeAttached();
	});

	test(`going back through the browser history keeps the reversed order instead of turning it over again on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator(`#${REVERSE_BUTTON_ID}`);
		await expect(button).toBeAttached({ timeout: 10000 });
		const startId = new URL(page.url()).searchParams.get("v");
		const before = await getPlaylistOrder(page);
		expect(before.length).toBeGreaterThan(1);
		await button.click();
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
		await spaNavigateToOtherPlaylistVideo(page);
		await expect.poll(async () => isLiveOrderReversed(page), { timeout: 20000 }).toBe(true);
		await spaNavigateBack(page, watch);
		expect(new URL(page.url()).searchParams.get("v")).toBe(startId);
		// YouTube brings the page back with the data the feature had already turned over; turning it over once more
		// would put YouTube's order back, so the reversal has to hold rather than merely appear.
		await expect.poll(async () => (await readLivePlaylist(page))?.selectedVideoId, { timeout: 20000 }).toBe(startId);
		await expect.poll(async () => isLiveOrderReversed(page), { timeout: 20000 }).toBe(true);
		await expectToStay(async () => isLiveOrderReversed(page), true, { durationMs: 4000, page });
		await expect(button).toBeAttached({ timeout: 15000 });
		await expect.poll(async () => readIsReversedState(page), { timeout: 10000 }).toBe(true);
	});

	test(`reverse button is not injected on a ${watch} page without a playlist`, async ({ page }) => {
		await navigateToPageType(page, watch, ["timestamps"]);
		expect(new URL(page.url()).searchParams.get("list")).toBeNull();
		await enableFeature(page, "playlistReverseButton.enabled");
		const {
			playlistReverseButton: { enabled }
		} = await readStoredOptions(page);
		expect(enabled).toBe(true);
		// Without a list in the address the setup does nothing at all; the button must not turn up later either.
		await expectToStay(async () => page.locator(`#${REVERSE_BUTTON_ID}`).count(), 0, { durationMs: 10_000, page });
	});

	test(`clicking the reverse button twice restores the original order on ${playlist}`, async ({ page }) => {
		await navigateToPageType(page, playlist, playlistRequirements);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator(`#${REVERSE_BUTTON_ID}`);
		await expect(button).toBeAttached({ timeout: 10000 });
		// Only the first page is loaded here on purpose: the feature has to fetch the rest before it reverses, so the
		// reversed list is the whole playlist's and its first entries are ones the page had not shown yet.
		const firstPage = await getPlaylistPageOrder(page);
		expect(firstPage.length).toBeGreaterThan(1);
		await button.click();
		await expect.poll(async () => readIsReversedState(page), { timeout: 10000 }).toBe(true);
		await expect
			.poll(async () => page.locator("ytd-playlist-video-list-renderer ytd-continuation-item-renderer").count(), { timeout: 60000 })
			.toBe(0);
		await expect.poll(async () => (await getPlaylistPageOrder(page)).slice(-firstPage.length), { timeout: 20000 }).toEqual([...firstPage].reverse());
		const reversedWhole = await getPlaylistPageOrder(page);
		expect(reversedWhole.length).toBeGreaterThan(firstPage.length);
		await button.click();
		await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 20000 }).toEqual([...reversedWhole].reverse());
		await expect.poll(async () => readIsReversedState(page), { timeout: 10000 }).toBe(false);
		expect((await getPlaylistPageOrder(page)).slice(0, firstPage.length)).toEqual(firstPage);
	});

	test(`reverse button is placed inside the playlist panel action row on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		await expect(page.locator(`#${REVERSE_BUTTON_ID}`)).toBeAttached({ timeout: 10000 });
		await expect
			.poll(
				async () =>
					page.evaluate(() => {
						const button = document.getElementById("yte-playlist-reverse-button");
						if (!button) return null;
						const startActions = document.querySelector(
							"#page-manager > ytd-watch-flexy #playlist #start-actions, #page-manager > ytd-watch-grid #playlist #start-actions"
						);
						return { containerId: button.parentElement?.id ?? null, inStartActions: startActions?.contains(button) ?? false };
					}),
				{ timeout: 10000 }
			)
			.toEqual({ containerId: REVERSE_BUTTON_CONTAINER_ID, inStartActions: true });
	});

	test(`reverse button is placed inside the playlist header action row on ${playlist}`, async ({ page }) => {
		await navigateToPageType(page, playlist, playlistRequirements);
		await enableFeature(page, "playlistReverseButton.enabled");
		await expect(page.locator(`#${REVERSE_BUTTON_ID}`)).toBeAttached({ timeout: 10000 });
		await expect
			.poll(
				async () =>
					page.evaluate(() => {
						const button = document.getElementById("yte-playlist-reverse-button");
						if (!button) return null;
						const actionRow = button.closest(".ytFlexibleActionsViewModelActionRow, yt-flexible-actions-view-model");
						const header = button.closest("ytd-playlist-header-renderer, yt-page-header-renderer, yt-page-header-view-model");
						return {
							containerId: button.parentElement?.id ?? null,
							inHeader: header !== null,
							inVisibleActionRow: actionRow instanceof HTMLElement && actionRow.clientWidth > 0
						};
					}),
				{ timeout: 10000 }
			)
			.toEqual({ containerId: REVERSE_BUTTON_CONTAINER_ID, inHeader: true, inVisibleActionRow: true });
	});

	test(`tooltip label toggles between the normal and reversed strings on ${playlist}`, async ({ page }) => {
		await navigateToPageType(page, playlist, playlistRequirements);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator(`#${REVERSE_BUTTON_ID}`);
		await expect(button).toBeAttached({ timeout: 10000 });
		const tooltip = page.locator("#yte-feature-playlistReverseButton-tooltip");
		await expect(button).toHaveAttribute("data-title", localeText("pages.content.features.playlistReverseButton.extras.toggle.off"));
		await button.dispatchEvent("mouseenter");
		await expect(tooltip).toHaveText("Normal order");
		await button.click();
		await expect(button).toHaveAttribute("data-title", localeText("pages.content.features.playlistReverseButton.extras.toggle.on"));
		// The click handler removes the open tooltip, so it has to be re-opened to read the swapped label.
		await button.dispatchEvent("mouseenter");
		await expect(tooltip).toHaveText("Reversed order");
		await button.click();
		await expect(button).toHaveAttribute("data-title", localeText("pages.content.features.playlistReverseButton.extras.toggle.off"));
		await button.dispatchEvent("mouseenter");
		await expect(tooltip).toHaveText("Normal order");
	});

	test(`a below player feature button is not adopted into the reverse button's container on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		await expect(page.locator(`#${REVERSE_BUTTON_ID}`)).toBeAttached({ timeout: 10000 });
		await setOption(page, "loopButton.button.placement", below);
		await enableFeature(page, "loopButton.button.enabled");
		await expect(page.locator("#yte-feature-loopButton-button")).toBeAttached({ timeout: 10000 });
		await expect(page.locator("div#primary-inner > div#yte-button-container > #yte-feature-loopButton-button")).toBeAttached({ timeout: 10000 });
		expect(
			await page.evaluate(() => {
				const loopButton = document.getElementById("yte-feature-loopButton-button");
				const reverseButton = document.getElementById("yte-playlist-reverse-button");
				if (!loopButton || !reverseButton) return null;
				return {
					inPlaylistPanel: loopButton.closest("#playlist") !== null,
					sharesReverseContainer: loopButton.parentElement === reverseButton.parentElement
				};
			})
		).toEqual({ inPlaylistPanel: false, sharesReverseContainer: false });
	});

	test(`reversing keeps the playing video selected at the mirrored panel position on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator(`#${REVERSE_BUTTON_ID}`);
		await expect(button).toBeAttached({ timeout: 10000 });
		const before = await getPlaylistOrder(page);
		expect(before.length).toBeGreaterThan(1);
		await expect.poll(async () => getSelectedPanelPosition(page), { timeout: 15000 }).not.toBeNull();
		const selectedBefore = await getSelectedPanelPosition(page);
		const stateBefore = await readLivePlaylist(page);
		expect(selectedBefore).not.toBeNull();
		expect(stateBefore).not.toBeNull();
		await button.click();
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
		await expect
			.poll(async () => getSelectedPanelPosition(page), { timeout: 15000 })
			.toEqual({
				index: selectedBefore!.total - 1 - selectedBefore!.index,
				total: selectedBefore!.total,
				videoId: selectedBefore!.videoId
			});
		// localCurrentIndex is what the panel and the next/previous buttons read, so it has to be mirrored too.
		await expect
			.poll(async () => (await readLivePlaylist(page))?.localCurrentIndex, { timeout: 10000 })
			.toBe(stateBefore!.length - 1 - stateBefore!.localCurrentIndex);
	});
});
