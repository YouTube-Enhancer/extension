import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord, placementSelectors } from "@/src/utils/_tests/constants";
import { clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, waitForExtensionReady } from "@/src/utils/_tests/navigation";
import { ensurePlayerControlsVisible } from "@/src/utils/_tests/pageSetup";

const { below, left, menu, right } = placementRecord;
const { home, shorts, watch } = pageTypeRecord;

test.describe("buttonController", () => {
	test.describe("featureMenu", () => {
		test("feature menu should be disabled", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", "feature_menu");
			const featureMenuButton = page.locator("#yte-feature-menu-button");
			await expect(featureMenuButton).toHaveCSS("display", "flex");
			await expect(featureMenuButton).toBeVisible();
			await disableFeature(page, "screenshotButton.button.enabled");
			await expect(featureMenuButton).toHaveCSS("display", "none");
			await expect(page.locator("#yte-feature-menu")).toHaveCSS("visibility", "hidden");
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
		test("feature menu should open on hover and hide after the pointer leaves when openType is hover", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", menu);
			const featureMenuButton = page.locator("#yte-feature-menu-button");
			await expect(featureMenuButton).toBeVisible();
			await setOption(page, "featureMenu.openType", "hover");
			const featureMenu = page.locator("#yte-feature-menu");
			await featureMenuButton.hover();
			await expect(featureMenu).toBeVisible();
			// The hover branch schedules the hide 80 ms after the pointer leaves the button, the menu and the player.
			await page.mouse.move(0, 0);
			await expect(featureMenu).not.toBeVisible();
		});
		test("switching featureMenu.openType to hover should rebind the menu listeners without a reload", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", menu);
			const featureMenuButton = page.locator("#yte-feature-menu-button");
			const featureMenu = page.locator("#yte-feature-menu");
			await expect(featureMenuButton).toBeVisible();
			// The default open type is "click", so hovering must leave the menu closed.
			await featureMenuButton.hover();
			await expectToStay(async () => await featureMenu.isVisible(), false, { durationMs: 1500, page });
			await page.mouse.move(0, 0);
			await setOption(page, "featureMenu.openType", "hover");
			await featureMenuButton.hover();
			await expect(featureMenu).toBeVisible();
		});
		test("feature menu should close when clicking outside the menu and its button", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", menu);
			const featureMenuButton = page.locator("#yte-feature-menu-button");
			await expect(featureMenuButton).toBeVisible();
			await featureMenuButton.click();
			const featureMenu = page.locator("#yte-feature-menu");
			await expect(featureMenu).toBeVisible();
			// The click-outside listener sits on the document root, so any click off the button and the menu dismisses it.
			await page.locator("div#movie_player").click();
			await expect(featureMenu).not.toBeVisible();
		});
		test("clicking a feature menu item should run its action and flip its checked state", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "loopButton.button.placement", menu);
			await enableFeature(page, "loopButton.button.enabled");
			const menuItem = page.locator("#yte-feature-loopButton-menuitem");
			await expect(menuItem).toBeAttached();
			await expect(menuItem).toHaveAttribute("aria-checked", "false");
			await clickFeatureMenuItem(page, watch, "yte-feature-loopButton-menuitem");
			// featureMenuClickListener is a separate path from the button click listener: it must run the feature and mark the item.
			await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", true);
			await expect(menuItem).toHaveAttribute("aria-checked", "true");
			await expect(menuItem).toHaveClass(/ytp-menuitem-checked/);
		});
		test("no feature menu button should be created on shorts", async ({ page }) => {
			await navigateToPageType(page, shorts);
			// enableFeatureMenuButton bails on every non-watch page, so neither the button nor the menu is ever built.
			await expectToStay(async () => await page.locator("#yte-feature-menu-button").count(), 0, { page });
			await expect(page.locator("#yte-feature-menu")).not.toBeAttached();
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
			test("should apply a fullscreenPlacement changed after the button was already placed", async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "loopButton.button.placement", left);
				await setOption(page, "loopButton.button.fullscreenPlacement", "same");
				await enableFeature(page, "loopButton.button.enabled");
				await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", left);
				// Only the fullscreen placement changes, so the button is not re-added: the tracked config must be patched in place.
				await setOption(page, "loopButton.button.fullscreenPlacement", right);
				await toggleFullscreen(page, true);
				await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", right);
				await toggleFullscreen(page, false);
				await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", left);
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
					if (placement === below) {
						// The below player container must not swallow page clicks while the buttons inside it stay interactive.
						await expect(page.locator(placementSelectors.below_player)).toHaveCSS("pointer-events", "none");
						await expect(page.locator("#yte-feature-screenshotButton-button")).toHaveCSS("pointer-events", "auto");
					}
				});
			}
		});
	});
	test.describe("below player container", () => {
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
	test.describe("tooltips", () => {
		test("hovering a player controls button should show its tooltip inside the player and remove it on pointer out", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "screenshotButton.button.placement", right);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", right);
			const button = page.locator("#yte-feature-screenshotButton-button");
			const title = await button.getAttribute("data-title");
			expect(title).toBeTruthy();
			await ensurePlayerControlsVisible(page, watch);
			await button.hover();
			const tooltip = page.locator("#yte-feature-screenshotButton-tooltip");
			await expect(tooltip).toBeAttached();
			await expect(tooltip).toHaveText(title!);
			// Buttons inside the player chrome anchor their tooltip on the player, not on the body.
			await expect.poll(async () => await getTooltipParent(page, "yte-feature-screenshotButton-tooltip")).toBe("movie_player");
			await page.mouse.move(0, 0);
			await expect(tooltip).not.toBeAttached();
		});
		test("hovering a below player button should attach its tooltip to the document body", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "screenshotButton.button.placement", below);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", below);
			const button = page.locator("#yte-feature-screenshotButton-button");
			const title = await button.getAttribute("data-title");
			expect(title).toBeTruthy();
			await button.hover();
			const tooltip = page.locator("#yte-feature-screenshotButton-tooltip");
			await expect(tooltip).toBeAttached();
			await expect(tooltip).toHaveText(title!);
			await expect.poll(async () => await getTooltipParent(page, "yte-feature-screenshotButton-tooltip")).toBe("BODY");
			await page.mouse.move(0, 0);
			await expect(tooltip).not.toBeAttached();
		});
	});
	test.describe("page restore", () => {
		test("extension should re-initialise after a browser back navigation", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "screenshotButton.button.placement", left);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", left);
			await navigateToPageType(page, home);
			await page.goBack();
			await waitForExtensionReady(page);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", left, { timeout: 30000 });
			// A live placement change only lands when the restore re-registered the storage listener.
			await setOption(page, "screenshotButton.button.placement", right);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", right, { timeout: 30000 });
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
/** Returns the id of the tooltip's parent element, falling back to its tag name (the body branch of createTooltip). */
async function getTooltipParent(page: Page, tooltipId: string): Promise<null | string> {
	return page.evaluate((id) => {
		const parent = document.getElementById(id)?.parentElement ?? null;
		if (!parent) return null;
		return parent.id || parent.tagName;
	}, tooltipId);
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
