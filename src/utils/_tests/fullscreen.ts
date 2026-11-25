import type { Page } from "@playwright/test";

import { expect } from "@/tests/harness";

/** Whether the watch page is in theater mode. */
export async function isInTheaterMode(page: Page): Promise<boolean> {
	return page.evaluate(
		() =>
			document.querySelector("ytd-watch-flexy, ytd-watch-grid")?.hasAttribute("theater") ?? false
	);
}

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
	await toggleFullscreenWithForeground(page, fullscreen, () =>
		fullscreenButton.evaluate((el) => (el as HTMLButtonElement).click())
	);
	await waitForFullscreenState(page, fullscreen);
}

/**
 * A toggle click carrying the foreground guarantee plan 060 proved Chromium needs: YouTube's
 * `requestFullscreen` is denied unless the browser window is OS-active, and every suite worker
 * opens at identical window coordinates, so a parallel navigation can steal the foreground between
 * our click and YouTube's handler — the toggle then never engages and `ytd-app[fullscreen]` never
 * appears (evidence in plan 060's execution record,
 * `plans/060-fullscreen-engage-investigation.md`). So bring the page to front and let the window
 * settle immediately before each click; if the attribute still has not flipped within ~3 s, restore
 * the foreground and click once more, then let the caller's original assertion decide.
 */
async function toggleFullscreenWithForeground(
	page: Page,
	fullscreen: boolean,
	click: () => Promise<void>
): Promise<void> {
	/** Whether `ytd-app` already reports the wanted state, polled for at most ~3 s. */
	const stateMatches = async (): Promise<boolean> => {
		try {
			await waitForFullscreenState(page, fullscreen, 3000);
			return true;
		} catch {
			return false;
		}
	};
	await page.bringToFront();
	await page.waitForTimeout(150);
	await click();
	if (await stateMatches()) return;
	await page.bringToFront();
	await page.waitForTimeout(150);
	await click();
}

async function waitForFullscreenState(
	page: Page,
	fullscreen: boolean,
	timeout?: number
): Promise<void> {
	const ytdApp = page.locator("ytd-app");
	const options = timeout === undefined ? undefined : { timeout };
	if (fullscreen) {
		await expect(ytdApp).toHaveAttribute("fullscreen", "", options);
		return;
	}
	await expect(ytdApp).not.toHaveAttribute("fullscreen", "", options);
}
