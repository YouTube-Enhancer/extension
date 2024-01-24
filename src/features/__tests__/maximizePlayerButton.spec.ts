import type { YouTubePlayer } from "node_modules/@types/youtube-player/dist/types";

import {
	clickFeatureMenuItem,
	disableFeature,
	enableFeature,
	expect,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	navigateToOptionsPage,
	navigateToYoutubePage,
	test
} from "playwright.config";
test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable maximize player button", async ({ page }) => {
	await enableFeature(page, "enable_maximize_player_button");
});
test("should disable maximize player button", async ({ page }) => {
	await disableFeature(page, "enable_maximize_player_button");
});
test("maximize player button should be enabled", async ({ page }) => {
	await enableFeature(page, "enable_maximize_player_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-maximizePlayerButton-menuitem");
});
test("maximize player button should be disabled", async ({ page }) => {
	await disableFeature(page, "enable_maximize_player_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeFalsy(page, "yte-feature-maximizePlayerButton-menuitem");
});
test("player should be maximized", async ({ page }) => {
	// TODO: fix this test failing
	await enableFeature(page, "enable_maximize_player_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-maximizePlayerButton-menuitem");
	await clickFeatureMenuItem(page, "yte-feature-maximizePlayerButton-menuitem");
	const isMaximized = await page.evaluate(async (selector) => {
		const container = document.querySelector(selector) as unknown as YouTubePlayer | null;
		if (!container) return null;
		const { height: playerHeight, width: playerWidth } = await container.getSize();
		const {
			documentElement: { clientHeight, clientWidth }
		} = document;
		console.log({ clientHeight, clientWidth, playerHeight, playerWidth });
		return playerHeight === clientHeight && playerWidth === clientWidth;
	}, "div#movie_player");
	expect(isMaximized).toBeTruthy();
	expect(isMaximized).toBe(true);
});
test("player shouldn't be maximized", async ({ page }) => {
	await disableFeature(page, "enable_maximize_player_button");
	await navigateToYoutubePage(page);
	const maximizePlayerButton = page.locator(`#yte-feature-maximizePlayerButton-menuitem`);
	await expect(maximizePlayerButton).not.toBeAttached();
	const isMaximized = await page.evaluate(async (selector) => {
		const container = document.querySelector(selector) as unknown as YouTubePlayer | null;
		if (!container) return null;
		const { height: playerHeight, width: playerWidth } = await container.getSize();
		const {
			documentElement: { clientHeight, clientWidth }
		} = document;
		console.log({ clientHeight, clientWidth, playerHeight, playerWidth });
		return playerHeight === clientHeight && playerWidth === clientWidth;
	}, "div#movie_player");
	expect(isMaximized).toBeFalsy();
});
