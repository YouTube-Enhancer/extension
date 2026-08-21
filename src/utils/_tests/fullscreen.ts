import type { Page } from "@playwright/test";

import { expect } from "playwright.config";

export async function toggleFullscreen(page: Page, fullscreen: boolean): Promise<void> {
	await page.locator("div#movie_player").hover();
	await page.locator("button.ytp-fullscreen-button").click();
	await waitForFullscreenState(page, fullscreen);
}

async function waitForFullscreenState(page: Page, fullscreen: boolean): Promise<void> {
	const ytdApp = page.locator("ytd-app");
	if (fullscreen) {
		await expect(ytdApp).toHaveAttribute("fullscreen", "");
		return;
	}
	await expect(ytdApp).not.toHaveAttribute("fullscreen", "");
}
