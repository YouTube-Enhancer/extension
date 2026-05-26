import { expect, type Page } from "@playwright/test";
import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { pageSetup } from "@/src/utils/_tests/pageSetup";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";

export type FixtureRequirement = "ambientMode" | "autoPlay" | "captions" | "videoHistory";

export type VideoFixture = {
	surfaces: Partial<Record<FixtureRequirement, boolean>>;
	url: string;
};
export const pageFixtures: Record<PageType, VideoFixture[]> = {
	channel_home: [{ surfaces: {}, url: "https://www.youtube.com/@RickAstleyYT" }],
	channel_videos: [{ surfaces: {}, url: "https://www.youtube.com/@RickAstleyYT/videos" }],
	home: [{ surfaces: {}, url: "https://www.youtube.com" }],
	live: [
		{
			surfaces: {},
			url: "https://www.youtube.com/channel/UC4R8DWoMoI7CAwX8_LjQHig"
		}
	],
	playlist: [
		{
			surfaces: {},
			url: "https://www.youtube.com/playlist?list=UUuAXFkgsw1L7xaCfnd5JJOw"
		}
	],
	search: [
		{
			surfaces: {},
			url: "https://www.youtube.com/results?search_query=test"
		}
	],
	shorts: [
		{
			surfaces: { ambientMode: true },
			url: "https://www.youtube.com/shorts/Ay8lynMZ4mE"
		}
	],
	subscriptions: [
		{
			surfaces: {},
			url: "https://www.youtube.com/feed/subscriptions"
		}
	],
	watch: [
		{
			surfaces: { ambientMode: true, autoPlay: false, captions: true, videoHistory: false },
			url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
		},
		{
			surfaces: { ambientMode: true, autoPlay: true, captions: true, videoHistory: true },
			url: "https://www.youtube.com/watch?v=epUk3T2Kfno"
		}
	]
};

export function getFixture(pageType: PageType, requirements: FixtureRequirement[] = []): VideoFixture {
	const { [pageType]: pool } = pageFixtures;
	const match = pool.find((fixture) => requirements.every((req) => fixture.surfaces?.[req] === true));
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
export async function navigateToPageType(page: Page, pageType: PageType, requirements: FixtureRequirement[] = []): Promise<void> {
	test.setTimeout(120_000);
	if (pageType === "live") {
		return await expect(async () => {
			await navigateToLiveVideo(page);
			await expect(page.locator(".ytp-live-badge")).toBeVisible();
		}).toPass({ timeout: 120_000 });
	}
	const fixture = getFixture(pageType, requirements);
	await navigateToYoutubePage(page, fixture.url, pageType);
}
async function navigateToLiveVideo(page: Page): Promise<void> {
	const {
		live: [{ url: channelUrl }]
	} = pageFixtures;
	await navigateToPage(page, channelUrl);
	const firstVideo = page
		.locator(
			'ytd-rich-item-renderer a[id="thumbnail"].ytd-thumbnail:has(ytd-thumbnail-overlay-time-status-renderer div badge-shape.ytBadgeShapeThumbnailLive)'
		)
		.first();
	await expect(firstVideo).toBeVisible();
	await Promise.all([page.waitForURL(/youtube\.com\/watch\?/), firstVideo.click()]);
	await page.bringToFront();
	await expect(page.locator("div#yte-message-from-youtube")).toBeAttached();
	await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
	await page.waitForLoadState("domcontentloaded");
	await waitForYoutubePlayerReady(page, "live");
	await pageSetup(page);
	await page.waitForTimeout(100);
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
