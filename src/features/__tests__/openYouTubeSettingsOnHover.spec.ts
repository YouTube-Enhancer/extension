import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/openYouTubeSettingsOnHover/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const { home, watch } = pageTypeRecord;
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
	}
	// The remaining cases are page-agnostic mouse-event bookkeeping (index.ts has no live-specific branch), so
	// they run on watch only; the open-on-hover test above already covers the includePages "live" gating and the
	// live fixture costs up to 120 s per iteration.
	test("youtube settings should not open on hover when disabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
		await expect(settingsMenu).not.toBeVisible({ timeout: 3000 });
	});
	test("youtube settings should close when leaving the settings button on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		const settingsButton = page.locator(".ytp-settings-button");
		const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
		await settingsButton.dispatchEvent("mouseenter");
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
		await page.waitForTimeout(500);
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
		const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
		await settingsButton.dispatchEvent("mouseenter");
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
		await page.waitForTimeout(500);
		await settingsButton.dispatchEvent("mouseleave", {
			relatedTarget: await settingsMenu.elementHandle()
		});
		await page.waitForTimeout(500);
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
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await disableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
	});
	test("re-applies after disable then re-enable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openYouTubeSettingsOnHover.enabled");
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
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
		const settingsMenu = page.locator(".ytp-settings-menu:not(#yte-feature-menu)");
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
		await page.reload();
		await navigateToPageType(page, watch);
		await forcePlayerVisible(page);
		await page.locator(".ytp-settings-button").dispatchEvent("mouseenter");
		await expect(settingsMenu).toBeVisible({ timeout: 15000 });
	});
});
