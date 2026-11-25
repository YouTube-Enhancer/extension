import type { Locator, Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";
import type { YouTubePlayerDiv } from "@/src/types";

import {
	type FixtureCapabilities,
	meetsFixtureCapabilities,
	verifyFixtureCapabilities
} from "@/src/utils/_tests/capabilities";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { markLiveFixturePage, unmarkLiveFixturePage } from "@/src/utils/_tests/liveFixture";
import { pageSetup } from "@/src/utils/_tests/pageSetup";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { expect, test } from "@/tests/harness";

export { fixtureCapabilities } from "@/src/utils/_tests/capabilities";
export type { FixtureCapabilities } from "@/src/utils/_tests/capabilities";

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
		},
		{
			// The signed-in account's Watch Later: YouTube's older playlist header with a chip bar over legacy rows.
			capabilities: ["playlistChipBar"],
			url: "https://www.youtube.com/playlist?list=WL"
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
			capabilities: ["timestamps", "commentTimestamps"],
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

export function getFixture(
	pageType: PageType,
	requirements: FixtureCapabilities[] = []
): VideoFixture {
	const { [pageType]: pool } = pageFixtures;
	const match = pool.find((fixture) =>
		requirements.every((surface) => fixture.capabilities.includes(surface))
	);
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
export async function navigateToPageType(
	page: Page,
	pageType: PageType,
	requirements: FixtureCapabilities[] = [],
	{ deadline }: { deadline?: number } = {}
): Promise<void> {
	if (pageType === "live") {
		// The attach/outcome budgets downstream scale off this marker (see attachBudget in assertions).
		markLiveFixturePage(page);
		// The hunt needs the time; a test that already allowed more keeps it.
		if (test.info().timeout < 120_000) test.setTimeout(120_000);
		await navigateToLiveVideo(page, requirements, deadline);
		await expect
			.poll(
				async () => {
					// An unavailable stream shows an error panel instead of ever rendering the badge;
					// skipping here beats waiting out the poll on a video that cannot come back.
					await skipIfLiveVideoUnavailable(page);
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
	unmarkLiveFixturePage(page);
	const fixture = getFixture(pageType, requirements);
	await navigateToYoutubePage(page, fixture.url, pageType);
	await verifyFixtureCapabilities(page, pageType, requirements);
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
 * Strong signals that the hunted live video itself is unavailable (its stream ended or was removed): the
 * player's own error overlay, the watch-page error renderer, or YouTube's unavailable block, either visible
 * or carrying the "Video unavailable" reason line. Only these known error surfaces count — never the absence
 * of the live badge or of any text — so a slow player cannot skip a test that would otherwise pass. Outside
 * a test body `test.skip` itself throws "can only be called inside test", so a misuse fails loudly.
 */
const LIVE_UNAVAILABLE_SELECTOR = [
	".ytp-error",
	"ytd-player-error-message-renderer",
	"#player-unavailable"
].join(", ");
const LIVE_UNAVAILABLE_REASON = "Video unavailable";
/**
 * Skips the current test when the live fixture's video is unavailable, so the live readiness poll ends in a
 * skip instead of hanging to its 120 s timeout. Call it from inside the poll: Playwright propagates a throw
 * out of the poll callback immediately rather than retrying it.
 */
export async function skipIfLiveVideoUnavailable(page: Page): Promise<void> {
	const surfaces = page.locator(LIVE_UNAVAILABLE_SELECTOR);
	const shown = await surfaces
		.first()
		.isVisible()
		.catch(() => false);
	const text = (await surfaces.allTextContents().catch(() => [])).join(" ");
	if (shown || text.includes(LIVE_UNAVAILABLE_REASON)) {
		test.skip(true, "pinned live video unavailable (environmental) — skipped, not failed");
	}
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
	await waitForExtensionReady(page);
	if (["live", "shorts", "watch"].includes(pageType)) {
		await waitForYoutubePlayerReady(page, pageType);
		// See spaNavigateToRelatedVideo: let a pre-roll ad start before pageSetup looks for one.
		await page.waitForTimeout(1000);
	}
	await pageSetup(page);
}
/**
 * Appended to a video tile or lockup so that neither a live stream nor a promoted video is the "video" a helper
 * clicks. The extension treats a live page as its own page type, so features gated to watch drop out there, and
 * its player has no autoplay toggle or timestamps; a promoted video is a short ad that ends before an assertion
 * gets to it. Signed-in feeds and related lists rank both first often enough to matter. The hooks are the LIVE
 * pill on the thumbnail (lockups), the legacy time-status overlay (older renderers) and the ad badge.
 */
const NOT_LIVE_OR_AD =
	':not(:has(.ytBadgeShapeText:text-is("LIVE"))):not(:has(ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"])):not(:has(.ytBadgeShapeAd))';
/** Navigates to the live fixture, skipping the test when no stream is on air. */
export async function navigateToLiveOrSkip(page: Page): Promise<void> {
	try {
		await navigateToPageType(page, pageTypeRecord.live);
	} catch (error) {
		test.skip(
			true,
			`no live stream is currently available on the fixture channel (${error instanceof Error ? error.message : String(error)})`
		);
	}
}
/**
 * Single-page navigation from a feed page (home, search, subscriptions, channel videos) to the first regular
 * video it lists, so the extension's navigation hooks and includePages gate run for a watch page.
 */
export async function spaNavigateToFirstVideo(page: Page): Promise<void> {
	// Only a visible link can be clicked: a feature under test may already be hiding tiles (a mix listed first on a
	// signed-in home feed is exactly what hidePlaylistRecommendationsFromHomePage removes).
	const link = page
		.locator(
			[
				`ytd-rich-item-renderer${NOT_LIVE_OR_AD} a#video-title-link[href^="/watch?v="]`,
				`ytd-video-renderer${NOT_LIVE_OR_AD} a#video-title[href^="/watch?v="]`,
				`ytd-rich-item-renderer${NOT_LIVE_OR_AD} a#thumbnail[href^="/watch?v="]`,
				`ytd-rich-item-renderer${NOT_LIVE_OR_AD} yt-lockup-view-model a[href^="/watch?v="]`,
				`ytd-item-section-renderer yt-lockup-view-model${NOT_LIVE_OR_AD} a[href^="/watch?v="]`
			].join(", ")
		)
		.locator("visible=true")
		.first();
	await expect(link).toBeAttached({ timeout: 15_000 });
	await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
	await link.click();
	await page.waitForURL((url) => url.pathname === "/watch", { timeout: 30_000 });
	await waitForExtensionReady(page);
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
	// A maximized player slides the masthead out of the viewport; resting the pointer at the top edge brings it
	// back, and when that does not happen in time the click is dispatched on the logo itself, which is still an
	// in-page navigation through YouTube's own click handling.
	await page.mouse.move(20, 0);
	await logo.click({ timeout: 5_000 }).catch(async () => {
		await logo.evaluate((el) => (el as HTMLElement).click());
	});
	await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
	await waitForExtensionReady(page);
	await expect(
		page.locator("ytd-rich-grid-renderer, ytd-two-column-browse-results-renderer").first()
	).toBeAttached({ timeout: 15_000 });
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
	// that never resolves, so only links that can actually be clicked qualify; live streams and promoted videos are skipped (NOT_LIVE_OR_AD).
	const link = page
		.locator(
			[
				`ytd-watch-next-secondary-results-renderer yt-lockup-view-model${NOT_LIVE_OR_AD} a[href^="/watch?v="]:not([href*="v=${before}"]):visible`,
				`ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer${NOT_LIVE_OR_AD} a[href^="/watch?v="]:not([href*="v=${before}"]):visible`
			].join(", ")
		)
		.first();
	// The sidebar renders late when an ad or a slow feed delays the watch page, and on a throttled session not at
	// all. The player's next button is an in-page navigation as well and does not depend on the sidebar.
	const linkRendered = await expect(link)
		.toBeAttached({ timeout: 15_000 })
		.then(() => true)
		.catch(() => false);
	if (linkRendered) {
		await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
		await link.click();
	} else {
		await page
			.locator("#movie_player .ytp-next-button")
			.evaluate((el) => (el as HTMLButtonElement).click());
	}
	await page.waitForURL((url) => url.searchParams.get("v") !== before, { timeout: 30_000 });
	await waitForExtensionReady(page);
	await waitForYoutubePlayerReady(page, "watch");
	// A pre-roll ad starts a moment after the player reports the new video; give it that moment so the ad
	// handling in pageSetup sees it instead of the test running into it.
	await page.waitForTimeout(1000);
	await pageSetup(page);
}
/**
 * Waits until the extension has finished its initial setup on the current page.
 *
 * The content script sends options/state via window.postMessage once ready. Config changes
 * sent before that point are silently dropped, so every helper that navigates must wait.
 */
export async function waitForExtensionReady(page: Page): Promise<void> {
	await expect(page.locator("html[yte-ready]")).toBeAttached({ timeout: 30_000 });
}
/**
 * Plays the stream the hunt just opened. A navigation landing while the play call is in flight
 * destroys the evaluate's context; that now propagates instead of restarting the hunt — the
 * harness owns its reloader (errorWatcher, stopped at teardown), so there is no unknown ambient
 * reload left to defend against here. Every other failure already propagated before this change.
 */
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
/**
 * Opens a live stream from the fixture channel, walking its streams until one meets the requirements. `deadline`
 * (epoch ms) stops the walk early so a caller can turn "ran out of time" into a skip before the test itself times out.
 */
async function navigateToLiveVideo(
	page: Page,
	requirements: FixtureCapabilities[] = [],
	deadline?: number
): Promise<void> {
	const {
		live: [{ url: channelUrl }]
	} = pageFixtures;
	const outOfTime = () => deadline !== undefined && Date.now() > deadline;
	for (let attempt = 0; attempt < 5 && !outOfTime(); attempt++) {
		await navigateToPage(page, channelUrl);
		const liveVideos = page.locator(
			'ytd-rich-item-renderer a[id="thumbnail"].ytd-thumbnail:has(ytd-thumbnail-overlay-time-status-renderer div badge-shape.ytBadgeShapeThumbnailLive)'
		);
		await expect(liveVideos.first()).toBeVisible({
			timeout: 60_000
		});
		const count = await liveVideos.count();
		let everyStreamOpened = true;
		for (let index = 0; index < count; index++) {
			if (outOfTime())
				throw new Error("Live stream hunt ran out of time before every stream was checked");
			const video = liveVideos.nth(index);
			if (!(await tryOpenLiveVideo(page, video, channelUrl))) {
				everyStreamOpened = false;
				continue;
			}
			await finishLiveVideoSetup(page);
			if (
				requirements.length === 0 ||
				(await meetsFixtureCapabilities(page, "live", requirements))
			) {
				return;
			}
			await navigateToPage(page, channelUrl);
		}
		// Every stream opened and none met the requirements; another pass over the same streams cannot change that.
		if (requirements.length > 0 && everyStreamOpened) break;
	}
	const reqMsg =
		requirements.length > 0 ? ` matching requirements: ${requirements.join(", ")}` : "";
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
	// A signed-in session can reload a page once with themeRefresh=1 appended; it is not part of the requested URL.
	const parsed = new URL(url);
	parsed.searchParams.delete("themeRefresh");
	return parsed.toString().replace(/\/$/, "");
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
