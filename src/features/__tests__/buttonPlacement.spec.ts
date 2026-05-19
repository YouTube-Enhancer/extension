import type { Page } from "@playwright/test";

import {
	clickFeatureButton,
	disableFeature,
	enableFeature,
	expect,
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	navigateToPageType,
	setOption,
	test
} from "playwright.config";

const watchPage = "watch" as const;

test.describe("screenshotButton", () => {
	for (const placement of ["player_controls_left", "player_controls_right", "below_player"] as const) {
		test(`should place screenshot button in ${placement}`, async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "screenshotButton.button.placement", placement);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", placement);
		});
		test(`should not place screenshot button when disabled in ${placement}`, async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "screenshotButton.button.placement", placement);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
			await disableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-screenshotButton-button");
		});
		test(`should take screenshot and save as file when clicking screenshot button in ${placement}`, async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "screenshotButton.button.placement", placement);
			await setOption(page, "screenshotButton.saveAs", "file");
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
			await clickFeatureButton(page, "yte-feature-screenshotButton-button", placement);
			const downloadPromise = page.waitForEvent("download");
			const download = await downloadPromise;
			expect(download).toBeTruthy();
		});
	}
});

test.describe("loopButton", () => {
	for (const placement of ["player_controls_left", "player_controls_right", "below_player"] as const) {
		test(`should place loop button in ${placement}`, async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "loopButton.button.placement", placement);
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", placement);
		});
		test(`should not place loop button when disabled in ${placement}`, async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "loopButton.button.placement", placement);
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await disableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-loopButton-button");
		});
		test(`should toggle loop when clicking loop button in ${placement}`, async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "loopButton.button.placement", placement);
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await clickFeatureButton(page, "yte-feature-loopButton-button", placement);
			const loop = await page.evaluate((selector) => {
				const videoElement = document.querySelector(selector) as unknown as HTMLVideoElement | null;
				if (!videoElement) return null;
				return videoElement.hasAttribute("loop");
			}, "div#movie_player video");
			expect(loop).toBeTruthy();
		});
	}
});
async function toggleFullscreen(page: Page, fullscreen: boolean): Promise<void> {
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
test.describe("fullscreen", () => {
	test("should move loop button from left to right controls when entering fullscreen and back when exiting", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await setOption(page, "loopButton.button.placement", "player_controls_left");
		await setOption(page, "loopButton.button.fullscreenPlacement", "player_controls_right");
		await enableFeature(page, "loopButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", "player_controls_left");
		await toggleFullscreen(page, true);
		await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", "player_controls_right");
		await toggleFullscreen(page, false);
		await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", "player_controls_left");
	});

	test("should move screenshot button from right to left controls when entering fullscreen and back when exiting", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await setOption(page, "screenshotButton.button.placement", "player_controls_right");
		await setOption(page, "screenshotButton.button.fullscreenPlacement", "player_controls_left");
		await enableFeature(page, "screenshotButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "player_controls_right");

		await toggleFullscreen(page, true);
		await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "player_controls_left");

		await toggleFullscreen(page, false);
		await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "player_controls_right");
	});

	test("should not move loop button when fullscreenPlacement is same", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await setOption(page, "loopButton.button.placement", "player_controls_right");
		await setOption(page, "loopButton.button.fullscreenPlacement", "same");
		await enableFeature(page, "loopButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", "player_controls_right");

		await toggleFullscreen(page, true);
		await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", "player_controls_right");

		await toggleFullscreen(page, false);
		await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", "player_controls_right");
	});

	test("should move screenshot button to feature menu when entering fullscreen and back when exiting", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await setOption(page, "screenshotButton.button.placement", "player_controls_left");
		await setOption(page, "screenshotButton.button.fullscreenPlacement", "feature_menu");
		await enableFeature(page, "screenshotButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "player_controls_left");

		await toggleFullscreen(page, true);
		await expectFeatureButtonToBeFalsy(page, "yte-feature-screenshotButton-button");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");

		await toggleFullscreen(page, false);
		await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "player_controls_left");
		await expectFeatureMenuItemToBeFalsy(page, "yte-feature-screenshotButton-menuitem");
	});

	test("should move screenshot button from below player to left controls when entering fullscreen and back when exiting", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await setOption(page, "screenshotButton.button.placement", "below_player");
		await setOption(page, "screenshotButton.button.fullscreenPlacement", "player_controls_left");
		await enableFeature(page, "screenshotButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "below_player");

		await toggleFullscreen(page, true);
		await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "player_controls_left");

		await toggleFullscreen(page, false);
		await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "below_player");
	});
});
