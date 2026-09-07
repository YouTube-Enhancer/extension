import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";
import type { configuration, Path } from "@/src/types";
import type { FilterKeysByValueType } from "@/src/utils/_tests/types";

import { pageTypeRecord, placementSelectors } from "@/src/utils/_tests/constants";
import { loadDefaultConfig, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType, reloadPage, spaNavigateToFirstVideo, spaNavigateToHome, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";

/**
 * Every feature at once. The per-feature specs prove each feature does its job; these cases prove that the whole
 * set can be switched on together on a page, survive the page changing under it, and be switched off again, without
 * the extension throwing. They reach the guards a healthy page never trips one feature at a time: a player that is
 * not there, a page a feature is not meant for, a teardown while another feature still holds the element.
 */
type Switch = FilterKeysByValueType<configuration, boolean>;
const { channel_home, channel_posts, channel_streams, channel_videos, home, live, playlist, search, shorts, subscriptions, watch } = pageTypeRecord;
/** How long the features get to finish their retry loops before the page is changed or the switches read back. */
const SETTLE_MS = 15_000;

/** Every configuration path whose last segment `matches`, found by walking the defaults. */
function collectPaths(node: unknown, matches: (key: string) => boolean, prefix = "", out: Path<configuration>[] = []): Path<configuration>[] {
	if (typeof node !== "object" || node === null) return out;
	for (const [key, value] of Object.entries(node)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (matches(key) && typeof value !== "object") out.push(path as Path<configuration>);
		else collectPaths(value, matches, path, out);
	}
	return out;
}

/** Every `enabled` switch in the configuration, features and their buttons alike. */
function collectSwitches(defaults: configuration): Switch[] {
	return collectPaths(defaults, (key) => key === "enabled") as Switch[];
}

async function enableEverythingOn(page: Page, pageType: PageType): Promise<{ errors: string[]; switches: Switch[] }> {
	const switches = collectSwitches(await loadDefaultConfig());
	expect(switches.length).toBeGreaterThan(50);
	await navigateToPageType(page, pageType);
	const errors = watchExtensionErrors(page);
	await setEverySwitch(page, switches, true);
	await page.waitForTimeout(SETTLE_MS);
	return { errors, switches };
}

async function setEverySwitch(page: Page, switches: Switch[], enabled: boolean): Promise<void> {
	for (const key of switches) await setOption(page, key, enabled);
}

/** Uncaught errors and unhandled rejections raised by the extension's own scripts on the page. */
function watchExtensionErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on("pageerror", (error) => {
		if ((error.stack ?? "").includes("chrome-extension://")) errors.push(`${error.message}\n${error.stack ?? ""}`);
	});
	return errors;
}

test.describe("every feature", () => {
	test(`every feature enabled on ${watch} survives an in-page round trip through home and a full disable`, async ({ page }) => {
		test.setTimeout(300_000);
		const { errors, switches } = await enableEverythingOn(page, watch);
		await expect(page.locator("html[yte-ready]")).toBeAttached();
		// Home has no player: every player-bound feature has to stand down, and the page-gated ones have to disable.
		await spaNavigateToHome(page);
		await page.waitForTimeout(SETTLE_MS);
		await spaNavigateToFirstVideo(page);
		await page.waitForTimeout(SETTLE_MS);
		await setEverySwitch(page, switches, false);
		await page.waitForTimeout(SETTLE_MS);
		expect(errors, "the extension raised errors on the page").toEqual([]);
		await expect(page.locator("div#movie_player")).toBeAttached();
	});
	test(`every feature enabled on ${shorts} and disabled again`, async ({ page }) => {
		test.setTimeout(240_000);
		const { errors, switches } = await enableEverythingOn(page, shorts);
		await setEverySwitch(page, switches, false);
		await page.waitForTimeout(SETTLE_MS);
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});
	test(`every feature enabled on ${playlist} and disabled again`, async ({ page }) => {
		test.setTimeout(240_000);
		const { errors, switches } = await enableEverythingOn(page, playlist);
		await setEverySwitch(page, switches, false);
		await page.waitForTimeout(SETTLE_MS);
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});
	test(`every feature enabled on a ${watch} page whose player is gone`, async ({ page }) => {
		test.setTimeout(240_000);
		await navigateToPageType(page, watch);
		// The features find the player by waiting for it; with the element removed every one of them has to give up
		// cleanly instead of throwing on a null it did not expect.
		await page.evaluate(() => document.querySelector("div#movie_player")?.remove());
		const errors = watchExtensionErrors(page);
		const switches = collectSwitches(await loadDefaultConfig());
		await setEverySwitch(page, switches, true);
		await page.waitForTimeout(SETTLE_MS * 2);
		await setEverySwitch(page, switches, false);
		await page.waitForTimeout(SETTLE_MS);
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});
	test(`every feature enabled on a ${watch} page without player controls, below-player host and owner row`, async ({ page }) => {
		test.setTimeout(240_000);
		await navigateToPageType(page, watch);
		// The hosts the buttons, the below-player container and the channel lookups attach to are gone, but the player
		// itself stays, so every feature gets past its player check and into its own placement guards.
		await page.evaluate(() => {
			for (const selector of [
				".ytp-left-controls",
				".ytp-right-controls",
				"div#primary > div#primary-inner > div#player",
				"#owner",
				"ytd-watch-metadata"
			]) {
				document.querySelector(selector)?.remove();
			}
		});
		const errors = watchExtensionErrors(page);
		const switches = collectSwitches(await loadDefaultConfig());
		await setEverySwitch(page, switches, true);
		await page.waitForTimeout(SETTLE_MS * 2);
		await setEverySwitch(page, switches, false);
		await page.waitForTimeout(SETTLE_MS);
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});
	test(`every button placed below the player, then in the feature menu, then in fullscreen with every feature enabled on ${watch}`, async ({
		page
	}) => {
		test.setTimeout(300_000);
		const defaults = await loadDefaultConfig();
		const placements = collectPaths(defaults, (key) => key === "placement");
		const fullscreenPlacements = collectPaths(defaults, (key) => key === "fullscreenPlacement");
		expect(placements.length).toBeGreaterThan(10);
		const { errors, switches } = await enableEverythingOn(page, watch);
		for (const key of placements) await setOption(page, key, "below_player");
		await page.waitForTimeout(SETTLE_MS);
		await expect(page.locator(placementSelectors.below_player)).toBeAttached();
		// Theater mode moves the below-player container into the watch element and back.
		await page.locator("button.ytp-size-button").evaluate((el) => (el as HTMLButtonElement).click());
		await page.waitForTimeout(5000);
		await expect(page.locator(placementSelectors.below_player)).toBeAttached();
		await page.locator("button.ytp-size-button").evaluate((el) => (el as HTMLButtonElement).click());
		await page.waitForTimeout(5000);
		for (const key of placements) await setOption(page, key, "feature_menu");
		await page.waitForTimeout(SETTLE_MS);
		await expect(page.locator("#yte-feature-menu-button")).toBeAttached();
		for (const key of placements) await setOption(page, key, "player_controls_left");
		for (const key of fullscreenPlacements) await setOption(page, key, "player_controls_right");
		await page.waitForTimeout(SETTLE_MS);
		await toggleFullscreen(page, true);
		await page.waitForTimeout(5000);
		await toggleFullscreen(page, false);
		await page.waitForTimeout(5000);
		await setEverySwitch(page, switches, false);
		await page.waitForTimeout(SETTLE_MS);
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});
	test(`every feature enabled survives a reload, theater mode and a related-video navigation on ${watch}`, async ({ page }) => {
		test.setTimeout(300_000);
		const { switches } = await enableEverythingOn(page, watch);
		// A load with everything already on takes the registry's enable-all path instead of one enable at a time.
		await reloadPage(page, watch);
		const errors = watchExtensionErrors(page);
		await page.waitForTimeout(SETTLE_MS);
		await page.locator("button.ytp-size-button").evaluate((el) => (el as HTMLButtonElement).click());
		await page.waitForTimeout(5000);
		await page.locator("button.ytp-size-button").evaluate((el) => (el as HTMLButtonElement).click());
		await page.waitForTimeout(5000);
		await spaNavigateToRelatedVideo(page);
		await page.waitForTimeout(SETTLE_MS);
		await setEverySwitch(page, switches, false);
		await page.waitForTimeout(SETTLE_MS);
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});
	test("every feature enabled across the feed and channel pages by full loads", async ({ page }) => {
		test.setTimeout(420_000);
		const { errors, switches } = await enableEverythingOn(page, home);
		// Each load starts the whole set on a page of that type; the channel tabs include the two the page-type
		// detector only learned on 2026-09-07.
		for (const pageType of [search, subscriptions, channel_home, channel_videos, channel_posts, channel_streams]) {
			await navigateToPageType(page, pageType);
			await page.waitForTimeout(SETTLE_MS / 2);
		}
		await setEverySwitch(page, switches, false);
		await page.waitForTimeout(SETTLE_MS / 2);
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});
	test(`every feature enabled on ${live} and disabled again`, async ({ page }) => {
		test.setTimeout(360_000);
		// A live watch page is its own page type: the live-only features start here and the watch-only ones stand down.
		const { errors, switches } = await enableEverythingOn(page, live);
		await setEverySwitch(page, switches, false);
		await page.waitForTimeout(SETTLE_MS);
		expect(errors, "the extension raised errors on the page").toEqual([]);
	});
	for (const { pageType, removed } of [
		{ pageType: watch, removed: ["video.html5-main-video", ".ytp-chrome-bottom", "#secondary", "ytd-comments", "ytd-playlist-panel-renderer"] },
		{ pageType: shorts, removed: ["#shorts-player", "ytd-reel-video-renderer", "#menu-button"] },
		{ pageType: playlist, removed: ["ytd-playlist-video-list-renderer", "ytd-playlist-header-renderer", "yt-page-header-view-model"] }
	] as const) {
		test(`every feature enabled on a ${pageType} page stripped of ${removed.join(", ")}`, async ({ page }) => {
			test.setTimeout(240_000);
			await navigateToPageType(page, pageType);
			// Each feature has to notice the part of the page it works on is missing and give up without throwing.
			await page.evaluate((selectors) => {
				for (const selector of selectors) document.querySelectorAll(selector).forEach((element) => element.remove());
			}, removed);
			const errors = watchExtensionErrors(page);
			const switches = collectSwitches(await loadDefaultConfig());
			await setEverySwitch(page, switches, true);
			await page.waitForTimeout(SETTLE_MS * 2);
			await setEverySwitch(page, switches, false);
			await page.waitForTimeout(SETTLE_MS);
			expect(errors, "the extension raised errors on the page").toEqual([]);
		});
	}
});
