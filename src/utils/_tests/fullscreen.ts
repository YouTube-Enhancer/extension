import type { Page } from "@playwright/test";

import { expect } from "playwright.config";

export async function toggleFullscreen(page: Page, fullscreen: boolean): Promise<void> {
	const isFullscreen = await page
		.locator("ytd-app")
		.evaluate((el) => el.hasAttribute("fullscreen"));
	if (isFullscreen === fullscreen) return;
	await page.locator("div#movie_player").hover();
	// On live pages the controls render late and re-hide quickly; the hidden state is
	// display:none, so even a forced Playwright click has no target. Click through the
	// DOM like everyFeature's other interactions: YouTube's handler does not care.
	const fullscreenButton = page.locator("button.ytp-fullscreen-button");
	await fullscreenButton.waitFor({ state: "attached", timeout: 30000 });
	await fullscreenButton.evaluate((el) => (el as HTMLButtonElement).click());
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
