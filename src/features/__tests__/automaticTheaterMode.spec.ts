import type { YouTubePlayer } from "node_modules/@types/youtube-player/dist/types";

import { disableFeature, enableFeature, expect, navigateToOptionsPage, navigateToYoutubePage, test } from "playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});
test("should enable automatic theater mode", async ({ page }) => {
	await enableFeature(page, "enable_automatic_theater_mode");
});
test("should disable automatic theater mode", async ({ page }) => {
	await disableFeature(page, "enable_automatic_theater_mode");
});
test("theater mode should be enabled", async ({ page }) => {
	await enableFeature(page, "enable_automatic_theater_mode");
	await navigateToYoutubePage(page);
	const theaterModeEnabled = await page.evaluate(async () => {
		const container = document.querySelector("div#movie_player") as unknown as YouTubePlayer | null;
		if (!container) return null;
		const { width: playerWidth } = await container.getSize();
		const {
			documentElement: { clientWidth }
		} = document;
		return playerWidth === clientWidth;
	});
	expect(theaterModeEnabled).toBeTruthy();
	expect(theaterModeEnabled).toBe(true);
});
test("theater mode should be disabled", async ({ page }) => {
	await disableFeature(page, "enable_automatic_theater_mode");
	await navigateToYoutubePage(page);
	const theaterModeEnabled = await page.evaluate(async () => {
		const container = document.querySelector("div#movie_player") as unknown as YouTubePlayer | null;
		if (!container) return null;
		const { width: playerWidth } = await container.getSize();
		const {
			documentElement: { clientWidth }
		} = document;
		return playerWidth === clientWidth;
	});
	expect(theaterModeEnabled).toBeFalsy();
	expect(theaterModeEnabled).toBe(false);
});
