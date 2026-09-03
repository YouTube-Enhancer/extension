import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/maximizePlayerButton/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	expectToggleButtonState,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { ensurePlayerControlsVisible } from "@/src/utils/_tests/pageSetup";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const maximizeOffTitle = "Maximize off";
const maximizeOnTitle = "Maximize on";
const { left, menu } = placementRecord;
const { home, watch } = pageTypeRecord;
test.describe("maximizePlayerButton", () => {
	for (const pageType of testPages) {
		test(`maximize player button should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		});
		test(`player should be maximized on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-maximizePlayerButton-button", left);
			await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		});
		test(`maximize player button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		});
	}

	// maximizePlayer/minimizePlayer only branch on theater mode and the new layout, never on live vs VOD, so this only runs on watch.
	test(`clicking maximize button again should un-maximize player on watch`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
	});

	// The enable/disable transition goes through featureButtonManager with no page-dependent code, so this only runs on watch.
	test(`maximize player button should re-appear after disable then re-enable on watch`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		await disableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-maximizePlayerButton-button");
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
	});

	test(`maximize player button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
	});

	test(`should not create maximize player button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		// The default placement is the feature menu, which never creates a button element: pin it to the player controls.
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-maximizePlayerButton-button");
		await expectFeatureMenuItemToBeFalsy(page, "yte-feature-maximizePlayerButton-menuitem");
	});

	test("clicking the maximize feature menu item should maximize and restore the player on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", menu);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-maximizePlayerButton-menuitem");
		const menuItem = page.locator("#yte-feature-maximizePlayerButton-menuitem");
		await expect(menuItem).toHaveAttribute("aria-checked", "false");
		await clickFeatureMenuItem(page, watch, "yte-feature-maximizePlayerButton-menuitem");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		await expect(menuItem).toHaveAttribute("aria-checked", "true");
		// maximizePlayer clicks YouTube's own size button, and that click bubbles into the feature menu's
		// click-outside listener, so the menu is closed again and the second toggle has to re-open it.
		await expect(menuItem).toBeHidden();
		await clickFeatureMenuItem(page, watch, "yte-feature-maximizePlayerButton-menuitem");
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		await expect(menuItem).toHaveAttribute("aria-checked", "false");
	});

	test("pressing Escape while maximized should restore the player on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		await expectToggleButtonState(page, "yte-feature-maximizePlayerButton-button", true, { title: maximizeOnTitle });
		await page.keyboard.press("Escape");
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		await expectToggleButtonState(page, "yte-feature-maximizePlayerButton-button", false, { title: maximizeOffTitle });
	});

	test("typing t in the search box should not restore a maximized player on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		// The masthead is translated off screen while maximized, so focus the search box instead of clicking it.
		await page
			.locator('input#search, input[name="search_query"]')
			.first()
			.evaluate((element: HTMLInputElement) => element.focus());
		await page.keyboard.press("t");
		// The keydown handler bails for events coming from an input, textarea or contenteditable.
		await expectToStay(async () => await page.evaluate(() => document.body.hasAttribute("yte-maximized")), true, { page });
	});

	test("clicking the player size button while maximized should restore the player on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		await ensurePlayerControlsVisible(page, watch);
		// A user click on YouTube's own size button is one of the runtime exit paths.
		await page.locator("button.ytp-size-button").click();
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		await expectToggleButtonState(page, "yte-feature-maximizePlayerButton-button", false, { title: maximizeOffTitle });
	});

	test("navigating away from watch in page while maximized should restore the player", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		// The masthead only comes back when the pointer reaches the top, and the logo lives in it.
		await movePointerToTop(page);
		await expect(page.locator("#masthead-container")).toHaveClass(/yte-header-visible/);
		await spaNavigateToHome(page);
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
	});

	test("masthead should hide while maximized and come back when the pointer reaches the top on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
		const masthead = page.locator("#masthead-container");
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		await expect(masthead).not.toHaveClass(/yte-header-visible/);
		await expect.poll(async () => (await masthead.boundingBox())?.y ?? 0).toBeLessThan(0);
		await movePointerToTop(page);
		await expect(masthead).toHaveClass(/yte-header-visible/);
		await expect.poll(async () => (await masthead.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
	});

	test("button should be added in the checked state when the player is already maximized on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized", { timeout: 20000 });
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
		// isPlayerMaximized decides both initialChecked and the label the button is built with.
		await expectToggleButtonState(page, "yte-feature-maximizePlayerButton-button", true, { title: maximizeOnTitle });
	});

	test("maximizing from theater mode should leave theater mode untouched on restore on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticTheaterMode.enabled");
		await expect.poll(async () => await isInTheaterMode(page), { timeout: 20000 }).toBe(true);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		await expect(page.locator("body")).toHaveAttribute("yte-size-button-state", "theater");
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		// The restore only clicks the size button when the player was maximized from the default size.
		await expect.poll(async () => await isInTheaterMode(page)).toBe(true);
	});

	test("maximizing should record the layout state and clear it again on restore on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		// index.css derives every maximized height from these custom properties and the size button state.
		await expect
			.poll(async () => await getMaximizedLayoutState(page))
			.toEqual({
				hasHeaderHeight: true,
				sizeButtonState: "default",
				videoHeightMatchesViewport: true
			});
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		await expect
			.poll(async () => await getMaximizedLayoutState(page))
			.toEqual({
				hasHeaderHeight: false,
				sizeButtonState: null,
				videoHeightMatchesViewport: false
			});
	});

	test.describe("feature conflicts", () => {
		test.describe("automaticallyMaximizePlayer vs automaticTheaterMode", () => {
			test("maximize is active when enabled after theater on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await enableFeature(page, "automaticTheaterMode.enabled");
				await enableFeature(page, "automaticallyMaximizePlayer.enabled");
				await expect.poll(async () => await page.evaluate(() => document.body.hasAttribute("yte-maximized")), { timeout: 20000 }).toBeTruthy();
			});

			test("theater mode is active when enabled after maximize on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await enableFeature(page, "automaticallyMaximizePlayer.enabled");
				// Maximizing enters theater mode through the size button itself. Enabling automaticTheaterMode before
				// that click has landed makes both features click the button, and the two toggles cancel out.
				await expect(page.locator("body")).toHaveAttribute("yte-maximized", { timeout: 15000 });
				await enableFeature(page, "automaticTheaterMode.enabled");
				await expect
					.poll(
						async () =>
							await page.evaluate(() => {
								const flexy = document.querySelector("ytd-watch-flexy");
								const grid = document.querySelector("ytd-watch-grid");
								return Boolean(flexy?.hasAttribute("theater") || grid?.hasAttribute("theater"));
							}),
						{ timeout: 15000 }
					)
					.toBe(true);
				// A maximized player does not count as theater mode, so automaticTheaterMode clicks the size button; the
				// maximized player takes that click as a user click and minimizes, and theater mode ends up on.
				await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
			});
		});
	});

	test.describe("automatic maximize state sync", () => {
		test("reflects automatic maximization in the button state on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
			const button = page.locator("#yte-feature-maximizePlayerButton-button");
			await expect(button).not.toHaveAttribute("aria-checked", "true");
			const offTitle = await button.getAttribute("data-title");
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect(page.locator("body")).toHaveAttribute("yte-maximized", { timeout: 15000 });
			await expect(button).toHaveAttribute("aria-checked", "true");
			await expect.poll(async () => button.getAttribute("data-title")).not.toBe(offTitle);
		});
		test("keeps the cued thumbnail overlay above the maximized video on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect(page.locator("body")).toHaveAttribute("yte-maximized", { timeout: 15000 });
			const overlay = page.locator("#movie_player .ytp-cued-thumbnail-overlay");
			await expect(overlay).toBeAttached();
			await expect(overlay).toHaveCSS("z-index", "1");
		});
	});
});

/** Reads the body state the maximized layout CSS depends on. */
async function getMaximizedLayoutState(page: Page) {
	return page.evaluate(() => ({
		hasHeaderHeight: document.body.style.getPropertyValue("--yte-header-height") !== "",
		sizeButtonState: document.body.getAttribute("yte-size-button-state"),
		videoHeightMatchesViewport: document.body.style.getPropertyValue("--yte-video-height") === `${window.innerHeight}px`
	}));
}
async function isInTheaterMode(page: Page): Promise<boolean> {
	return page.evaluate(() => document.querySelector("ytd-watch-flexy, ytd-watch-grid")?.hasAttribute("theater") ?? false);
}
/**
 * Sweeps the pointer up to the top edge of the viewport the way a real pointer travels, in steps.
 * headerMouseMoveHandler reveals the masthead 300 ms after a move with clientY inside the masthead's own
 * height, and it only tracks the hidden state from the moves it sees below that band, so a single teleport
 * to the top would leave the handler believing the masthead is still showing.
 */
async function movePointerToTop(page: Page) {
	await page.mouse.move(640, 4, { steps: 20 });
}
