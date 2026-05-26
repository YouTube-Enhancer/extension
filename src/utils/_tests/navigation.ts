import { expect, type Page } from "@playwright/test";
import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { pageSetup } from "@/src/utils/_tests/pageSetup";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";

export const fixtureCapabilities = ["ambientMode", "autoPlay", "captions", "videoHistory", "monoAudio", "playlistLength"] as const;

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
	await page.goto(url);
	await page.waitForLoadState("domcontentloaded");
	expect(normalizeUrl(page.url())).toBe(normalizeUrl(url));
}
export async function navigateToPageType(page: Page, pageType: PageType, requirements: FixtureCapabilities[] = []): Promise<void> {
	test.setTimeout(120_000);
	if (pageType === "live") {
		await navigateToLiveVideo(page);
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
async function navigateToLiveVideo(page: Page): Promise<void> {
	const {
		live: [{ url: channelUrl }]
	} = pageFixtures;
	await navigateToPage(page, channelUrl);
	const liveVideoLocator = page.locator(
		'ytd-rich-item-renderer a[id="thumbnail"].ytd-thumbnail:has(ytd-thumbnail-overlay-time-status-renderer div badge-shape.ytBadgeShapeThumbnailLive)'
	);
	await expect(liveVideoLocator.first()).toBeVisible({
		timeout: 60_000
	});
	const initialUrl = normalizeUrl(page.url());
	for (let attempt = 0; attempt < 5; attempt++) {
		const liveVideo = liveVideoLocator.first();
		await expect(liveVideo).toBeVisible({
			timeout: 15_000
		});
		await liveVideo.click();
		const navigated = await expect
			.poll(
				() => {
					const url = normalizeUrl(page.url());
					if (url === initialUrl) {
						return false;
					}
					return /youtube\.com\/watch\?/.test(url);
				},
				{
					intervals: [250, 500, 1000],
					timeout: 15_000
				}
			)
			.toBeTruthy()
			.then(() => true)
			.catch(() => false);
		if (!navigated) {
			await page.goto(channelUrl, {
				waitUntil: "domcontentloaded"
			});
			continue;
		}
		const watchShell = page.locator("ytd-watch-flexy,ytd-watch-grid");
		const watchLoaded = await expect(watchShell)
			.toBeAttached({
				timeout: 15_000
			})
			.then(() => true)
			.catch(() => false);
		if (!watchLoaded) {
			await page.goto(channelUrl, {
				waitUntil: "domcontentloaded"
			});
			continue;
		}
		await page.bringToFront();
		await expect(page.locator("div#yte-message-from-youtube")).toBeAttached();
		await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
		await waitForYoutubePlayerReady(page, "live");
		await pageSetup(page);
		await page.waitForTimeout(100);
		return;
	}
	throw new Error("Failed to navigate to a live video after multiple attempts");
}
async function navigateToYoutubePage(page: Page, pageUrl: string, pageType: PageType = "watch") {
	if (normalizeUrl(page.url()) !== normalizeUrl(pageUrl)) {
		await navigateToPage(page, pageUrl);
	}
	await page.bringToFront();
	await expect(page.locator("div#yte-message-from-youtube")).toBeAttached();
	await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
	await page.waitForLoadState("domcontentloaded");
	if (["live", "shorts", "watch"].includes(pageType)) {
		await waitForYoutubePlayerReady(page, pageType);
	}
	await pageSetup(page);
}
function normalizeUrl(url: string): string {
	return url.replace(/\/$/, "");
}
