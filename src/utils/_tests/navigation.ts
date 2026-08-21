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
async function finishLiveVideoSetup(page: Page): Promise<void> {
	await expect(page.locator("div#yte-message-from-youtube")).toBeAttached();
	await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
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
	await expect(page.locator("div#yte-message-from-youtube")).toBeAttached();
	await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
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
