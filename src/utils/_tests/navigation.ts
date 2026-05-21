import { expect, type Page } from "@playwright/test";
import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { pageSetup } from "@/src/utils/_tests/pageSetup";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
export const pageUrlMap: Record<PageType, Record<"alt" | "main", string> | string> = {
	channel_home: "https://www.youtube.com/@RickAstleyYT",
	channel_videos: "https://www.youtube.com/@RickAstleyYT/videos",
	home: "https://www.youtube.com",
	live: "https://www.youtube.com/channel/UC4R8DWoMoI7CAwX8_LjQHig",
	playlist: "https://www.youtube.com/playlist?list=UUuAXFkgsw1L7xaCfnd5JJOw",
	search: "https://www.youtube.com/results?search_query=test",
	shorts: "https://www.youtube.com/shorts/Ay8lynMZ4mE",
	subscriptions: "https://www.youtube.com/feed/subscriptions",
	watch: {
		alt: "https://www.youtube.com/watch?v=epUk3T2Kfno",
		main: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
	}
};
export async function navigateToPage(page: Page, url: string) {
	await page.goto(url);
	await page.waitForLoadState("domcontentloaded");
	expect(page.url().replace(/\/$/, "")).toBe(url.replace(/\/$/, ""));
}

export async function navigateToPageType(page: Page, pageType: PageType, alternative: boolean = false): Promise<void> {
	test.setTimeout(120_000);
	if (pageType === "live")
		return await expect(async () => {
			await navigateToLiveVideo(page);
			await expect(page.locator(".ytp-live-badge")).toBeVisible();
		}).toPass({
			timeout: 120_000
		});
	const { [pageType]: objOrString } = pageUrlMap;
	const url =
		typeof objOrString === "string" ? objOrString
		: alternative ? objOrString.alt
		: objOrString.main;
	await navigateToYoutubePage(page, url, pageType);
}
async function navigateToLiveVideo(page: Page): Promise<void> {
	const channelUrl = pageUrlMap.live as string;
	await navigateToPage(page, channelUrl);
	const firstVideo = page.locator('ytd-rich-item-renderer a[id="thumbnail"]').first();
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
	if (["live", "shorts", "watch"].includes(pageType)) await waitForYoutubePlayerReady(page, pageType);
	await pageSetup(page);
}
function normalizeUrl(url: string): string {
	return url.replace(/\/$/, "");
}
