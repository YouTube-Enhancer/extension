import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord, placementSelectors } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const { below, left, right } = placementRecord;
const { watch } = pageTypeRecord;

test.describe("buttonController", () => {
	test.describe("featureMenu", () => {
		test("feature menu should be enabled", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", "feature_menu");
			const featureMenuButton = page.locator("#yte-feature-menu-button");
			await expect(featureMenuButton).toBeAttached();
		});
		test("feature menu should be disabled", async ({ page }) => {
			await navigateToPageType(page, watch);
			await disableFeature(page, "screenshotButton.button.enabled");
			const featureMenuButton = page.locator("#yte-feature-menu-button");
			await expect(featureMenuButton).not.toBeVisible();
		});
		test("should add feature menu item to feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", "feature_menu");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
		});
		test("feature menu should open when button is clicked", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", "feature_menu");
			const featureMenuButton = page.locator("#yte-feature-menu-button");
			await expect(featureMenuButton).toBeAttached();
			await featureMenuButton.click();
			const featureMenu = page.locator("#yte-feature-menu");
			await expect(featureMenu).toBeVisible();
		});
		test("feature menu item should be added when feature enabled and removed when disabled", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", "feature_menu");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
			await disableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureMenuItemToBeFalsy(page, "yte-feature-screenshotButton-menuitem");
		});
		test("feature menu should close when button is clicked again", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", "feature_menu");
			const featureMenuButton = page.locator("#yte-feature-menu-button");
			await expect(featureMenuButton).toBeAttached();
			// Open the menu
			await featureMenuButton.click();
			const featureMenu = page.locator("#yte-feature-menu");
			await expect(featureMenu).toBeVisible();
			// Move cursor away from the menu so it doesn't intercept the next click
			await page.mouse.move(0, 0);
			await page.waitForTimeout(200);
			// Close the menu
			await featureMenuButton.click();
			await expect(featureMenu).not.toBeVisible();
		});
	});
	test.describe("buttonPlacement", () => {
		test.describe("fullscreen", () => {
			test("should move loop button from left to right controls when entering fullscreen and back when exiting", async ({ page }) => {
				await navigateToPageType(page, watch);
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
				await navigateToPageType(page, watch);
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
				await navigateToPageType(page, watch);
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
				await navigateToPageType(page, watch);
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
				await navigateToPageType(page, watch);
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
					await navigateToPageType(page, watch);
					await setOption(page, "screenshotButton.button.placement", placement);
					await enableFeature(page, "screenshotButton.button.enabled");
					await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
					await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", placement);
				});
				test(`should not place screenshot button when disabled in ${placement}`, async ({ page }) => {
					await navigateToPageType(page, watch);
					await setOption(page, "screenshotButton.button.placement", placement);
					await enableFeature(page, "screenshotButton.button.enabled");
					await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
					await disableFeature(page, "screenshotButton.button.enabled");
					await expectFeatureButtonToBeFalsy(page, "yte-feature-screenshotButton-button");
				});
			}
		});
	});
	test.describe("below player container", () => {
		test("container ignores pointer events while its buttons stay clickable", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "screenshotButton.button.placement", below);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", below);
			await expect(page.locator(placementSelectors.below_player)).toHaveCSS("pointer-events", "none");
			await expect(page.locator("#yte-feature-screenshotButton-button")).toHaveCSS("pointer-events", "auto");
		});
		test("container is centred on the player and follows theater mode on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "screenshotButton.button.placement", below);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", below);
			await expectContainerToMatchPlayer(page);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expect
				.poll(async () => page.evaluate(() => document.querySelector("ytd-watch-flexy, ytd-watch-grid")?.hasAttribute("theater") ?? false), {
					timeout: 15000
				})
				.toBe(true);
			await expectContainerToMatchPlayer(page);
		});
	});
});

async function expectContainerToMatchPlayer(page: Page): Promise<void> {
	await expect
		.poll(
			async () =>
				page.evaluate((selector) => {
					const container = document.querySelector(selector);
					const player = document.querySelector("#movie_player");
					if (!container || !player) return false;
					const containerRect = container.getBoundingClientRect();
					const playerRect = player.getBoundingClientRect();
					return Math.abs(containerRect.left - playerRect.left) <= 1 && Math.abs(containerRect.width - playerRect.width) <= 1;
				}, placementSelectors.below_player),
			{ timeout: 10000 }
		)
		.toBe(true);
}

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
