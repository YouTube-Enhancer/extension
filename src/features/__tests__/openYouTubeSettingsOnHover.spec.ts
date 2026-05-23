import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/openYouTubeSettingsOnHover/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

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

test.describe("openYouTubeSettingsOnHover", () => {
	for (const pageType of testPages) {
		test(`youtube settings should open on hover when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
			await forcePlayerVisible(page);
			await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
			const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
			await expect(settingsMenu).toBeVisible({ timeout: 10000 });
		});
		test(`youtube settings should not open on hover when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "openYouTubeSettingsOnHover.enabled");
			await forcePlayerVisible(page);
			await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
			await page.waitForTimeout(500);
			const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
			await expect(settingsMenu).not.toBeVisible();
		});
		test(`youtube settings should close when leaving the settings button on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
			await forcePlayerVisible(page);
			const settingsButton = page.locator(".ytp-settings-button");
			const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
			await settingsButton.dispatchEvent("mouseenter");
			await expect(settingsMenu).toBeVisible({ timeout: 10000 });
			await settingsButton.dispatchEvent("mouseleave", {
				relatedTarget: await page.locator("body").elementHandle()
			});
			await expect(settingsMenu).not.toBeVisible();
		});
		test(`youtube settings should stay open when moving from button to settings menu on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
			await forcePlayerVisible(page);
			const settingsButton = page.locator(".ytp-settings-button");
			const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
			await settingsButton.dispatchEvent("mouseenter");
			await expect(settingsMenu).toBeVisible({ timeout: 10000 });
			await settingsButton.dispatchEvent("mouseleave", {
				relatedTarget: await settingsMenu.elementHandle()
			});
			await expect(settingsMenu).toBeVisible();
		});
		test(`youtube settings should close when leaving the settings menu on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
			await forcePlayerVisible(page);
			const settingsButton = page.locator(".ytp-settings-button");
			const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
			await settingsButton.dispatchEvent("mouseenter");
			await expect(settingsMenu).toBeVisible({ timeout: 10000 });
			await settingsButton.dispatchEvent("mouseleave", {
				relatedTarget: await settingsMenu.elementHandle()
			});
			await settingsMenu.dispatchEvent("mouseleave", {
				relatedTarget: await page.locator("body").elementHandle()
			});
			await expect(settingsMenu).not.toBeVisible();
		});
	}
});
