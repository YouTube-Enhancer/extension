import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyMaximizePlayer/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateBack, spaNavigateToHome, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { ensurePlayerControlsVisible } from "@/src/utils/_tests/pageSetup";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { watch } = pageTypeRecord;

/** Clicks YouTube's own player size button the way a user would, i.e. without the programmatic-click guard. */
async function clickPlayerSizeButton(page: Page): Promise<void> {
	await ensurePlayerControlsVisible(page, watch);
	await page.locator("button.ytp-size-button").evaluate((el) => (el as HTMLButtonElement).click());
}
/** Reads YouTube's own theater layout flag, the state maximizePlayer branches on and minimizePlayer restores. */
async function isInTheaterMode(page: Page): Promise<boolean> {
	return await page.evaluate(() => {
		const container = document.querySelector("ytd-watch-grid") ?? document.querySelector("ytd-watch-flexy");
		return container?.hasAttribute("theater") ?? false;
	});
}
async function isPlayerMaximized(page: Page): Promise<boolean> {
	return await page.locator("body").evaluate((body) => body.hasAttribute("yte-maximized"));
}
/** Puts the player into (or out of) theater mode through the size button, so a test owns that precondition. */
async function setTheaterMode(page: Page, desired: boolean): Promise<void> {
	if ((await isInTheaterMode(page)) === desired) return;
	await clickPlayerSizeButton(page);
	await expect.poll(async () => isInTheaterMode(page), { timeout: 10000 }).toBe(desired);
}

test.describe("automaticallyMaximizePlayer", () => {
	for (const pageType of testPages) {
		test(`player should automatically maximize on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
		});
		test(`player should re-maximize after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
			await disableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page)).toBeFalsy();
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
		});
	}

	// Watch only: there is no page branch in automaticallyMaximizePlayer/index.ts, and the live variant costs two full live-video hunts plus a home load.
	test(`player should maximize after navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
		// A real single-page navigation: navigateStartHandler drops yte-maximized, so only onNavigate can put it back.
		await spaNavigateToRelatedVideo(page);
		await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
	});
	// Watch only: on live the reload is immediately discarded because navigateToPageType re-enters the live branch and opens a live video again.
	test(`player should maximize after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
		await reloadPage(page, watch);
		await expect.poll(async () => await isPlayerMaximized(page), { timeout: 15000 }).toBeTruthy();
	});

	test(`should not maximize player on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		// The maximize task has a 20 s budget, so a single poll would sample long before a gating regression could show.
		await expectToStay(async () => isPlayerMaximized(page), false, { durationMs: 5000, intervalMs: 500, page });
	});

	test(`maximizing sets the size-button state and viewport CSS variables on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setTheaterMode(page, false);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized", "", { timeout: 15000 });
		// The layout CSS keys off these three values, so yte-maximized alone renders nothing without them.
		await expect(page.locator("body")).toHaveAttribute("yte-size-button-state", "default");
		const { headerHeight, mastheadHeight, videoHeight, viewportHeight } = await page.evaluate(() => {
			const {
				body: { style }
			} = document;
			const masthead = document.querySelector("#masthead-container");
			return {
				headerHeight: style.getPropertyValue("--yte-header-height"),
				mastheadHeight: masthead?.getBoundingClientRect().height ?? null,
				videoHeight: style.getPropertyValue("--yte-video-height"),
				viewportHeight: window.innerHeight
			};
		});
		expect(videoHeight).toBe(`${viewportHeight}px`);
		expect(mastheadHeight).not.toBeNull();
		expect(Math.abs(Number.parseFloat(headerHeight) - mastheadHeight!)).toBeLessThan(1);
		// The variable is only worth setting if the player actually grows to it.
		await expect(page.locator("div#movie_player")).toHaveCSS("height", videoHeight);
	});
	test(`pressing Escape minimizes the automatically maximized player on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized", "", { timeout: 15000 });
		await page.keyboard.press("Escape");
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		await expect(page.locator("body")).not.toHaveAttribute("yte-size-button-state");
	});
	test(`minimizes when navigating away in-page and re-maximizes on returning to ${watch}`, async ({ page }) => {
		test.skip(!hasAuthState(), "home requires login");
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized", "", { timeout: 15000 });
		// Only a genuine yt-navigate-start away from watch reaches navigateStartHandler; a document load never does.
		await spaNavigateToHome(page);
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized", { timeout: 15000 });
		await spaNavigateBack(page, "watch");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized", "", { timeout: 20000 });
	});
	test(`disabling restores the player out of theater mode on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		// Starting outside theater mode is what makes maximizing the thing that puts the player into it.
		await setTheaterMode(page, false);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized", "", { timeout: 15000 });
		await expect(page.locator("body")).toHaveAttribute("yte-size-button-state", "default");
		await expect.poll(async () => isInTheaterMode(page), { timeout: 10000 }).toBe(true);
		await disableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		// Without the restoring click the user is left in YouTube theater mode after switching the feature off.
		await expect.poll(async () => isInTheaterMode(page), { timeout: 10000 }).toBe(false);
	});
	test(`disabling keeps theater mode when the player was already in theater on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setTheaterMode(page, true);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized", "", { timeout: 15000 });
		// maximizePlayer skips the size-button click when the player already is in theater and records that.
		await expect(page.locator("body")).toHaveAttribute("yte-size-button-state", "theater");
		expect(await isInTheaterMode(page)).toBe(true);
		await disableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		// minimizePlayer only clicks the size button back for the "default" state, so the user layout survives.
		await expectToStay(async () => isInTheaterMode(page), true, { durationMs: 3000, intervalMs: 500, page });
	});
	test(`clicking the player size button while automatically maximized minimizes the player on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setTheaterMode(page, false);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized", "", { timeout: 15000 });
		// Wait for the feature size-button click to land first, so the click below is not swallowed by the
		// programmatic-click guard.
		await expect.poll(async () => isInTheaterMode(page), { timeout: 10000 }).toBe(true);
		await clickPlayerSizeButton(page);
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
		await expect(page.locator("body")).not.toHaveAttribute("yte-size-button-state");
	});
	test(`reveals the header on a mouse move to the top of the viewport while maximized on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticallyMaximizePlayer.enabled");
		await expect(page.locator("body")).toHaveAttribute("yte-maximized", "", { timeout: 15000 });
		const masthead = page.locator("#masthead-container");
		// Maximizing translates the masthead fully off screen; only a mouse move into its band brings it back.
		await expect(masthead).not.toHaveClass(/(^|\s)yte-header-visible(\s|$)/);
		await page.mouse.move(640, 400);
		await page.mouse.move(640, 5);
		await expect(masthead).toHaveClass(/(^|\s)yte-header-visible(\s|$)/);
		await expect(masthead).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
		await page.mouse.move(640, 500);
		await expect(masthead).not.toHaveClass(/(^|\s)yte-header-visible(\s|$)/);
	});
});
