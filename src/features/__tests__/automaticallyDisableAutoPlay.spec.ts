import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyDisableAutoPlay/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToFirstVideo, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { channel_videos: channelVideosPage, watch } = pageTypeRecord;

async function getAutoPlayState(page: Page) {
	const toggle = page.locator(".ytp-autonav-toggle-button");
	await expect(toggle).toHaveAttribute("aria-checked", /^(true|false)$/);
	const value = await toggle.getAttribute("aria-checked");
	return value === "true";
}

/**
 * YouTube's newer control bar sometimes folds its low-priority buttons away on load, the autoplay toggle among
 * them: the toggle stays in the DOM with an inline `display: none`, its expander is hidden as well, and a click
 * through the toggle's own handler changes nothing (probed 2026-09-04; not reproducible on demand). The feature
 * under test goes through the player's autonav API in that state, but this helper's click has to be a real one
 * so the choice persists to the account, and a fresh load usually unfolds the toggle: one reload is tried before
 * the test stops with a reason.
 */
async function setAutoPlayState(page: Page, enabled: boolean) {
	const toggle = page.locator(".ytp-autonav-toggle");
	await expect(toggle).toBeAttached();
	if (!(await toggle.isVisible())) {
		await reloadPage(page, watch);
		await expect(toggle).toBeAttached();
	}
	test.skip(!(await toggle.isVisible()), "YouTube folded the autoplay toggle away on this load, so neither the test nor the feature can click it");
	const currentState = await getAutoPlayState(page);
	if (currentState !== enabled) {
		await toggle.click();
		await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(enabled);
	}
}

test.describe("automaticallyDisableAutoPlay", () => {
	for (const pageType of testPages) {
		test(`disables autoplay on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["autoPlay"]);
			await setAutoPlayState(page, true);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
		});
		test(`does not re-enable autoplay when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["autoPlay"]);
			await setAutoPlayState(page, false);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			// Autoplay is already off, so a single poll would pass on its first sample. Watch the state for longer
			// than the enable task's settle window (10 x 300 ms) so a stray click would be observed.
			await expectToStay(() => getAutoPlayState(page), false, { durationMs: 4000, intervalMs: 500, page });
			await disableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expectToStay(() => getAutoPlayState(page), false, { durationMs: 4000, intervalMs: 500, page });
		});
		test(`restores autoplay when disabled after being enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["autoPlay"]);
			await setAutoPlayState(page, true);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
			await disableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(true);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
		});
		test(`persists disable after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["autoPlay"]);
			await setAutoPlayState(page, true);
			await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
			await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
			// Turn autoplay back on so YouTube restores it on the next load; without this the post-reload assertion
			// cannot tell the extension re-applying the override from YouTube simply remembering the off state.
			await setAutoPlayState(page, true);
			await reloadPage(page, pageType);
			await expect.poll(() => getAutoPlayState(page), { timeout: 15000 }).toBe(false);
		});
	}

	// The cases below run on watch only: makeNavigateTask and makeEnableTask have no page branch beyond isWatchPage().
	test(`keeps autoplay on for later videos once the user turns it back on on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["autoPlay"]);
		await setAutoPlayState(page, true);
		await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
		await expect.poll(() => getAutoPlayState(page), { timeout: 10000 }).toBe(false);
		// The user overrules the extension for the rest of the session; hasOverriddenDefault is already set, so the
		// navigate task has to leave this choice alone.
		await setAutoPlayState(page, true);
		await spaNavigateToRelatedVideo(page);
		// The navigate task gets 10 attempts at the default 500 ms interval, so watch longer than that window.
		await expectToStay(() => getAutoPlayState(page), true, { durationMs: 6000, intervalMs: 500, page });
	});
	test(`disables autoplay after an in-page navigation from ${channelVideosPage} onto a watch page`, async ({ page }) => {
		await navigateToPageType(page, watch, ["autoPlay"]);
		// YouTube remembers the autonav preference across loads, so turning it on here is what makes the video reached
		// below start with autoplay on and the final assertion depend on the feature.
		await setAutoPlayState(page, true);
		await navigateToPageType(page, channelVideosPage);
		// channel_videos is outside includePages, so enabling here only records the config: no lifecycle hook runs.
		await enableFeature(page, "automaticallyDisableAutoPlay.enabled");
		// The single-page navigation is what makes the dependencies met, so onEnable and onNavigate both run from it.
		await spaNavigateToFirstVideo(page);
		await expect.poll(() => getAutoPlayState(page), { timeout: 15000 }).toBe(false);
	});
});
