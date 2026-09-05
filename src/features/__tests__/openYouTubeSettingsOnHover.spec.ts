import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/openYouTubeSettingsOnHover/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const { watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const SETTINGS_MENU_SELECTOR = ".ytp-settings-menu:not(#yte-feature-menu)";

async function forcePlayerVisible(page: Parameters<typeof enableFeature>[0]) {
	// Force player containers visible — on some videos (e.g. ended live streams) YouTube
	// sets visibility:hidden on #player-container which cascades to the settings menu popup
	await page.evaluate(() => {
		(
			["#movie_player", "#player-container", "#player-container-inner", "#player-container-outer", "ytd-player", "ytd-player #container"] as const
		).forEach((sel) => {
			const el = document.querySelector<HTMLElement>(sel);
			if (el) el.style.visibility = "visible";
		});
		document.querySelector("#movie_player")?.classList.remove("ytp-autohide");
	});
}

/**
 * Hovers the settings button until the menu opens. The feature attaches its listeners after several
 * asynchronous element waits, so a single mouseenter right after enabling can land before they exist.
 */
async function hoverUntilSettingsOpen(page: Parameters<typeof enableFeature>[0]) {
	const settingsButton = page.locator(".ytp-settings-button");
	const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
	await expect
		.poll(
			async () => {
				await settingsButton.dispatchEvent("mouseenter");
				return settingsMenu.isVisible();
			},
			{ intervals: [500], timeout: 15000 }
		)
		.toBe(true);
}

test.describe("openYouTubeSettingsOnHover", () => {
	for (const pageType of testPages) {
		test(`youtube settings should open on hover when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
			await forcePlayerVisible(page);
			await hoverUntilSettingsOpen(page);
		});
	}
	// The remaining cases are page-agnostic mouse-event bookkeeping (index.ts has no live-specific branch), so
	// they run on watch only; the open-on-hover test above already covers the includePages "live" gating and the
	// live fixture costs up to 120 s per iteration.
	test("youtube settings should not open on hover when disabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		await expect(settingsMenu).not.toBeVisible({ timeout: 3000 });
	});
	test("youtube settings should stop opening on hover after the feature is disabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		const settingsButton = page.locator(".ytp-settings-button");
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		// Starting from the enabled state is what makes this observe onDisable rather than the shipped default.
		await hoverUntilSettingsOpen(page);
		// Move mouse away so :hover doesn't prevent hideSettings from closing
		await page.mouse.move(0, 0);
		await page.waitForTimeout(100);
		await settingsButton.dispatchEvent("mouseleave", {
			relatedTarget: await page.locator("body").elementHandle()
		});
		await expect(settingsMenu).not.toBeVisible({ timeout: 5000 });
		await disableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await settingsButton.dispatchEvent("mouseenter");
		// onDisable removes the hover listeners, so the menu has to stay closed for the whole settle window.
		await expectToStay(async () => settingsMenu.isVisible(), false, { page });
	});
	test("opening a submenu keeps a hover-opened settings menu open on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		const settingsButton = page.locator(".ytp-settings-button");
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		// Real pointer moves: the feature decides by where the pointer is, so dispatched events would not do.
		await page.locator("#movie_player").hover();
		await expect
			.poll(
				async () => {
					await settingsButton.hover();
					return settingsMenu.isVisible();
				},
				{ intervals: [500], timeout: 15000 }
			)
			.toBe(true);
		// Opening a submenu makes YouTube swap the panel, which fires a mouseleave on the menu and drops its :hover
		// while the pointer stays put; the feature used to read that as the pointer leaving and close the menu.
		await settingsMenu
			.locator(".ytp-menuitem")
			.filter({ hasText: /Quality/ })
			.first()
			.click();
		await expect(settingsMenu.locator(".ytp-panel-title")).toHaveText(/Quality/);
		await expectToStay(async () => settingsMenu.isVisible(), true, { page });
		await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
		// Leaving still closes it.
		await page.mouse.move(10, 300);
		await expect(settingsButton).toHaveAttribute("aria-expanded", "false");
	});
	test("hovering should not close a settings menu that was opened by clicking the button on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		const settingsButton = page.locator(".ytp-settings-button");
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		// A scripted click leaves the pointer where it is, so the mouseenter below is the only hover the
		// feature ever sees - a real click would move the mouse onto the button and fire it implicitly.
		await settingsButton.evaluate((button: HTMLButtonElement) => button.click());
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
		await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
		await settingsButton.dispatchEvent("mouseenter");
		// showSettings must no-op while the menu is already open; a second click would close it again.
		await expectToStay(async () => settingsMenu.isVisible(), true, { page });
		await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
	});
	test("youtube settings should close when leaving the settings button on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		const settingsButton = page.locator(".ytp-settings-button");
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		await hoverUntilSettingsOpen(page);
		await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
		// Move mouse away so :hover doesn't prevent hideSettings from closing
		await page.mouse.move(0, 0);
		await page.waitForTimeout(100);
		await settingsButton.dispatchEvent("mouseleave", {
			relatedTarget: await page.locator("body").elementHandle()
		});
		await expect(settingsMenu).not.toBeVisible({ timeout: 5000 });
	});
	test("youtube settings should close when leaving the settings menu on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		const settingsButton = page.locator(".ytp-settings-button");
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		await hoverUntilSettingsOpen(page);
		await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
		// Moving from the button into the menu must keep it open. onMouseLeave ignores relatedTarget and
		// schedules hideSettings 50 ms later, so the menu mouseenter has to land inside that window - both
		// events are therefore dispatched synchronously in a single evaluate.
		await page.evaluate((menuSelector) => {
			const button = document.querySelector(".ytp-settings-button");
			const menu = document.querySelector(menuSelector);
			if (!button || !menu) throw new Error("settings button or menu not found");
			button.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true, relatedTarget: menu }));
			menu.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, relatedTarget: button }));
		}, SETTINGS_MENU_SELECTOR);
		await expectToStay(async () => settingsButton.getAttribute("aria-expanded"), "true", { durationMs: 500, page });
		await expect(settingsMenu).toBeVisible();
		// Move mouse away so :hover doesn't prevent hideSettings from closing
		await page.mouse.move(0, 0);
		await page.waitForTimeout(100);
		await settingsMenu.dispatchEvent("mouseleave", {
			relatedTarget: await page.locator("body").elementHandle()
		});
		await expect(settingsMenu).not.toBeVisible({ timeout: 5000 });
	});
	test("youtube settings should open on hover after navigation on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		// A genuine in-document navigation, so the listeners under test are the ones onNavigate re-attaches
		// rather than the ones a fresh onEnable would install.
		await spaNavigateToRelatedVideo(page);
		await forcePlayerVisible(page);
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		await expect(settingsMenu).not.toBeVisible();
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
	});
	test("re-applies after disable then re-enable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
		await disableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
	});
	test("persists after full page reload on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
		await page.reload();
		await navigateToPageType(page, watch);
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		await expect(settingsMenu).toBeVisible({ timeout: 15000 });
	});
});
