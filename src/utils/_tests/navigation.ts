import { expect, type Locator, type Page, test } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";
import type { YouTubePlayerDiv } from "@/src/types";

import { ensurePlayerControlsVisible, pageSetup } from "@/src/utils/_tests/pageSetup";
import { getCaptionsState, waitForYoutubePlayerReady } from "@/src/utils/_tests/player";

export const fixtureCapabilities = [
	"ambientMode",
	"autoPlay",
	"captions",
	"dubbedAudio",
	"endScreenCards",
	"playlistManagementButtons",
	"playlistLength",
	"timestamps",
	"videoHistory",
	"monoAudio"
] as const;

export type FixtureCapabilities = (typeof fixtureCapabilities)[number];

export type VideoFixture = {
	capabilities: FixtureCapabilities[];
	url: string;
};
export const pageFixtures: Record<PageType, VideoFixture[]> = {
	channel_home: [
		{
			capabilities: [],
			url: "https://www.youtube.com/@RickAstleyYT"
		}
	],
	channel_posts: [
		{
			capabilities: [],
			url: "https://www.youtube.com/@RickAstleyYT/posts"
		}
	],
	channel_streams: [
		{
			capabilities: [],
			url: "https://www.youtube.com/@RickAstleyYT/streams"
		}
	],
	channel_videos: [
		{
			capabilities: [],
			url: "https://www.youtube.com/@RickAstleyYT/videos"
		}
	],
	home: [
		{
			capabilities: [],
			url: "https://www.youtube.com"
		}
	],
	live: [
		{
			capabilities: [],
			url: "https://www.youtube.com/channel/UC4R8DWoMoI7CAwX8_LjQHig"
		}
	],
	playlist: [
		{
			capabilities: ["playlistLength"],
			url: "https://www.youtube.com/playlist?list=UUuAXFkgsw1L7xaCfnd5JJOw"
		},
		{
			capabilities: ["playlistLength", "playlistManagementButtons"],
			url: "https://www.youtube.com/playlist?list=PLA-lApStgDt8"
		}
	],
	search: [
		{
			capabilities: [],
			url: "https://www.youtube.com/results?search_query=test"
		}
	],
	shorts: [
		{
			capabilities: ["ambientMode"],
			url: "https://www.youtube.com/shorts/Ay8lynMZ4mE"
		},
		{
			capabilities: ["dubbedAudio"],
			url: "https://www.youtube.com/shorts/BUJWQiqhWLM"
		}
	],
	subscriptions: [
		{
			capabilities: [],
			url: "https://www.youtube.com/feed/subscriptions"
		}
	],
	watch: [
		{
			capabilities: ["ambientMode", "captions", "playlistLength"],
			url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=UUuAXFkgsw1L7xaCfnd5JJOw"
		},
		{
			capabilities: ["ambientMode", "autoPlay", "captions", "videoHistory"],
			url: "https://www.youtube.com/watch?v=epUk3T2Kfno"
		},
		{
			capabilities: ["monoAudio"],
			url: "https://www.youtube.com/watch?v=ReYYEs-tHx4"
		},
		{
			capabilities: ["timestamps"],
			url: "https://www.youtube.com/watch?v=yk4I80XVuk4"
		},
		{
			capabilities: ["dubbedAudio"],
			url: "https://www.youtube.com/watch?v=BUJWQiqhWLM"
		},
		{
			capabilities: ["endScreenCards"],
			url: "https://www.youtube.com/watch?v=GBHR9XZazv4"
		}
	]
};

export function getFixture(pageType: PageType, requirements: FixtureCapabilities[] = []): VideoFixture {
	const { [pageType]: pool } = pageFixtures;
	const match = pool.find((fixture) => requirements.every((surface) => fixture.capabilities.includes(surface)));
	if (!match) {
		throw new Error(`No fixture for ${pageType} matching requirements: ${requirements.join(", ")}`);
	}
	return match;
}
export async function navigateToPage(page: Page, url: string) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			await page.goto(url, { waitUntil: "domcontentloaded" });
			expect(normalizeUrl(page.url())).toBe(normalizeUrl(url));
			return;
		} catch (error) {
			if (attempt === 2) throw error;
			await page.waitForTimeout(500);
		}
	}
}
export async function navigateToPageType(page: Page, pageType: PageType, requirements: FixtureCapabilities[] = []): Promise<void> {
	if (pageType === "live") {
		test.setTimeout(120_000);
		await navigateToLiveVideo(page, requirements);
		await expect
			.poll(
				async () => {
					return await page.locator(".ytp-live-badge").isVisible();
				},
				{
					intervals: [500],
					timeout: 120_000
				}
			)
			.toBe(true);
		return;
	}
	const fixture = getFixture(pageType, requirements);
	await navigateToYoutubePage(page, fixture.url, pageType);
}
/**
 * Reloads the current document and waits for the extension and (on player pages) the player to be ready again.
 * Use this instead of `page.reload()` followed by `navigateToPageType`, which on live pages hunts for a new
 * stream and discards the reloaded document.
 */
export async function reloadPage(page: Page, pageType: PageType): Promise<void> {
	await page.reload({ waitUntil: "domcontentloaded" });
	await waitForExtensionReady(page);
	if (["live", "shorts", "watch"].includes(pageType)) {
		await waitForYoutubePlayerReady(page, pageType);
	}
	await pageSetup(page);
}
/**
 * Returns to the previous page through the browser history, which YouTube handles as a single-page navigation
 * (popstate), so the extension's navigation hooks run without a document load. Use it as the "and back" leg of
 * a navigation test: unlike spaNavigateToFirstVideo it does not depend on the feed listing any videos, which a
 * logged-out home page does not.
 */
export async function spaNavigateBack(page: Page, pageType: PageType): Promise<void> {
	const before = page.url();
	await page.goBack();
	await page.waitForURL((url) => url.toString() !== before, { timeout: 30_000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
	if (["live", "shorts", "watch"].includes(pageType)) {
		await waitForYoutubePlayerReady(page, pageType);
		// See spaNavigateToRelatedVideo: let a pre-roll ad start before pageSetup looks for one.
		await page.waitForTimeout(1000);
	}
	await pageSetup(page);
}
/**
 * Single-page navigation from a feed page (home, search, subscriptions, channel videos) to the first regular
 * video it lists, so the extension's navigation hooks and includePages gate run for a watch page.
 */
export async function spaNavigateToFirstVideo(page: Page): Promise<void> {
	const link = page
		.locator(
			[
				'ytd-rich-item-renderer a#video-title-link[href^="/watch?v="]',
				'ytd-video-renderer a#video-title[href^="/watch?v="]',
				'ytd-rich-item-renderer a#thumbnail[href^="/watch?v="]',
				'ytd-rich-item-renderer yt-lockup-view-model a[href^="/watch?v="]',
				'ytd-item-section-renderer yt-lockup-view-model a[href^="/watch?v="]'
			].join(", ")
		)
		.first();
	await expect(link).toBeAttached({ timeout: 15_000 });
	await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
	await link.click();
	await page.waitForURL((url) => url.pathname === "/watch", { timeout: 30_000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
	await waitForYoutubePlayerReady(page, "watch");
	// A pre-roll ad starts a moment after the player reports the new video; give it that moment so the ad
	// handling in pageSetup sees it instead of the test running into it.
	await page.waitForTimeout(1000);
	await pageSetup(page);
}
/**
 * Single-page navigation to the home feed by clicking YouTube's logo, so features gated to other pages get
 * their onNavigate/disable path instead of a full document load.
 */
export async function spaNavigateToHome(page: Page): Promise<void> {
	const logo = page.locator("ytd-topbar-logo-renderer a#logo, a#logo").first();
	await expect(logo).toBeAttached({ timeout: 15_000 });
	await logo.click();
	await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
	await expect(page.locator("ytd-rich-grid-renderer, ytd-two-column-browse-results-renderer").first()).toBeAttached({ timeout: 15_000 });
	await pageSetup(page);
}
/**
 * Performs a genuine single-page navigation from a watch page to another video by clicking a related video in
 * the sidebar, so YouTube fires yt-navigate-start/finish and the extension's onNavigate hooks run.
 * Resolves once the video id in the URL has changed and the player is ready again.
 */
export async function spaNavigateToRelatedVideo(page: Page): Promise<void> {
	const before = new URL(page.url()).searchParams.get("v");
	// The sidebar renders an aria-hidden thumbnail anchor ahead of the visible one for some lockups, and clicking
	// that never resolves, so only links that can actually be clicked qualify.
	const link = page.locator(`ytd-watch-next-secondary-results-renderer a[href^="/watch?v="]:not([href*="v=${before}"]):visible`).first();
	await expect(link).toBeAttached({ timeout: 15_000 });
	await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
	await link.click();
	await page.waitForURL((url) => url.searchParams.get("v") !== before, { timeout: 30_000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
	await waitForYoutubePlayerReady(page, "watch");
	// A pre-roll ad starts a moment after the player reports the new video; give it that moment so the ad
	// handling in pageSetup sees it instead of the test running into it.
	await page.waitForTimeout(1000);
	await pageSetup(page);
}
/**
 * Waits until the extension has finished its initial setup on the current page.
 *
 * The content script only forwards storage changes once the embedded script reports the page as
 * loaded (it marks this by setting `yte-ready` on the root element). Config changes sent before
 * that point are silently dropped, so every helper that navigates must wait for the marker.
 */
export async function waitForExtensionReady(page: Page): Promise<void> {
	await expect(page.locator("div#yte-message-from-youtube")).toBeAttached();
	await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
	await expect(page.locator("html[yte-ready]")).toBeAttached({ timeout: 30_000 });
}
async function finishLiveVideoSetup(page: Page): Promise<void> {
	await waitForExtensionReady(page);
	await waitForYoutubePlayerReady(page, "live");
	await pageSetup(page);
	await page.evaluate(async () => {
		const player = document.querySelector<YouTubePlayerDiv>("#movie_player");
		await player?.playVideo?.();
	});
	await page.waitForTimeout(100);
}
async function navigateToLiveVideo(page: Page, requirements: FixtureCapabilities[] = []): Promise<void> {
	const {
		live: [{ url: channelUrl }]
	} = pageFixtures;
	for (let attempt = 0; attempt < 5; attempt++) {
		await navigateToPage(page, channelUrl);
		const liveVideos = page.locator(
			'ytd-rich-item-renderer a[id="thumbnail"].ytd-thumbnail:has(ytd-thumbnail-overlay-time-status-renderer div badge-shape.ytBadgeShapeThumbnailLive)'
		);
		await expect(liveVideos.first()).toBeVisible({
			timeout: 60_000
		});
		const count = await liveVideos.count();
		for (let index = 0; index < count; index++) {
			const video = liveVideos.nth(index);
			if (!(await tryOpenLiveVideo(page, video, channelUrl))) {
				continue;
			}
			await finishLiveVideoSetup(page);
			if (requirements.length === 0 || (await videoMeetsCapabilities(page, requirements))) {
				return;
			}
			await navigateToPage(page, channelUrl);
		}
	}
	const reqMsg = requirements.length > 0 ? ` matching requirements: ${requirements.join(", ")}` : "";
	throw new Error(`Failed to navigate to a live video${reqMsg} after multiple attempts`);
}
async function navigateToYoutubePage(page: Page, pageUrl: string, pageType: PageType = "watch") {
	if (normalizeUrl(page.url()) !== normalizeUrl(pageUrl)) {
		await navigateToPage(page, pageUrl);
	}
	await page.bringToFront();
	await page.waitForLoadState("domcontentloaded");
	await waitForExtensionReady(page);
	if (["live", "shorts", "watch"].includes(pageType)) {
		await waitForYoutubePlayerReady(page, pageType);
	}
	await pageSetup(page);
}
function normalizeUrl(url: string): string {
	return url.replace(/\/$/, "");
}
async function tryOpenLiveVideo(page: Page, video: Locator, channelUrl: string): Promise<boolean> {
	await expect(video).toBeVisible();
	await page.bringToFront();
	try {
		await Promise.all([
			page.waitForURL(/youtube\.com\/watch\?/, {
				timeout: 15_000
			}),
			video.click()
		]);
	} catch {
		return false;
	}
	const watchShell = page.locator("ytd-watch-flexy,ytd-watch-grid");
	try {
		await expect(watchShell).toBeAttached({
			timeout: 15_000
		});
	} catch {
		await navigateToPage(page, channelUrl);
		return false;
	}
	try {
		await expect
			.poll(
				async () => {
					return await page.evaluate(async () => {
						const player = document.querySelector<YouTubePlayerDiv>("#movie_player");
						const result = await player?.getVideoData?.();
						return result?.isLive === true;
					});
				},
				{
					intervals: [500],
					timeout: 30_000
				}
			)
			.toBe(true);
	} catch {
		await navigateToPage(page, channelUrl);
		return false;
	}
	return true;
}
async function videoMeetsCapabilities(page: Page, requirements: FixtureCapabilities[]): Promise<boolean> {
	for (const req of requirements) {
		switch (req) {
			case "captions": {
				await ensurePlayerControlsVisible(page, "live");
				const state = await getCaptionsState(page);
				if (state === null) return false;
				break;
			}
		}
	}
	return true;
}
