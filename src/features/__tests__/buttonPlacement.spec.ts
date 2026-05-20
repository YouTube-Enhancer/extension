import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy
} from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const watchPage = "watch" as const;
const left = "player_controls_left" as const;
const right = "player_controls_right" as const;
const below = "below_player" as const;

test.describe("buttonPlacement", () => {
	test.describe("fullscreen", () => {
		test("should move loop button from left to right controls when entering fullscreen and back when exiting", async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "loopButton.button.placement", left);
			await setOption(page, "loopButton.button.fullscreenPlacement", right);
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", left);
		});
		test("should move screenshot button from right to left controls when entering fullscreen and back when exiting", async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "screenshotButton.button.placement", right);
			await setOption(page, "screenshotButton.button.fullscreenPlacement", left);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", left);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", right);
		});
		test("should not move loop button when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "loopButton.button.placement", right);
			await setOption(page, "loopButton.button.fullscreenPlacement", "same");
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", right);
		});
		test("should move screenshot button to feature menu when entering fullscreen and back when exiting", async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "screenshotButton.button.placement", left);
			await setOption(page, "screenshotButton.button.fullscreenPlacement", "feature_menu");
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeFalsy(page, "yte-feature-screenshotButton-button");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", left);
			await expectFeatureMenuItemToBeFalsy(page, "yte-feature-screenshotButton-menuitem");
		});
		test("should move screenshot button from below player to left controls when entering fullscreen and back when exiting", async ({ page }) => {
			await navigateToPageType(page, watchPage);
			await setOption(page, "screenshotButton.button.placement", below);
			await setOption(page, "screenshotButton.button.fullscreenPlacement", left);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", below);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", left);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", below);
		});
	});
	test.describe("normal", () => {
		for (const placement of [left, right, below] as const) {
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
		}
	});
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
