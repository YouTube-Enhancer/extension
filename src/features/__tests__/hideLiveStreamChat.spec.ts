import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import type { YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/hideLiveStreamChat/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideLiveStreamChat: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, live, watch } = pageTypeRecord;

/** Whether the player currently reports a live stream, which is what the feature branches on in onEnable/onDisable. */
async function isPlayingLive(page: Page): Promise<boolean> {
	return page.evaluate(async () => {
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		const data = await player?.getVideoData?.();
		return data?.isLive === true;
	});
}
/**
 * In-page navigation from a live stream to a related video that is not itself live, so the includePages gate flips
 * from live to watch inside the same document and the feature's onDisable path runs for real.
 */
async function spaNavigateToRelatedVod(page: Page): Promise<void> {
	const before = new URL(page.url()).searchParams.get("v");
	const link = page
		.locator("ytd-watch-next-secondary-results-renderer")
		.locator(
			`yt-lockup-view-model:not(:has(badge-shape.ytBadgeShapeThumbnailLive)) a[href^="/watch?v="]:not([href*="v=${before}"]), ytd-compact-video-renderer:not(:has([overlay-style="LIVE"])) a[href^="/watch?v="]:not([href*="v=${before}"])`
		)
		.first();
	// The sidebar next to a live stream renders late and sometimes not until the page is scrolled; when it never
	// lists a VOD there is no in-page path to a VOD from this stream, which is the stream's state, not a failure.
	let rendered = false;
	for (let nudge = 0; nudge < 4 && !rendered; nudge++) {
		await page.evaluate((offset) => window.scrollTo(0, offset), (nudge % 2) * 600);
		rendered = await link
			.waitFor({ state: "attached", timeout: 7500 })
			.then(() => true)
			.catch(() => false);
	}
	test.skip(!rendered, "no related VOD rendered next to this live stream");
	await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
	await link.click();
	await page.waitForURL((url) => url.searchParams.get("v") !== before, { timeout: 30000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
	await waitForYoutubePlayerReady(page, watch);
	// The gate only leaves `live` when the destination really is a VOD, so make that a precondition of the test.
	await expect.poll(async () => isPlayingLive(page), { timeout: 15000 }).toBe(false);
}

test.describe("hideLiveStreamChat", () => {
	for (const pageType of testPages) {
		test(`hides live stream chat on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideLiveStreamChat.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
		test(`hides live stream chat after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideLiveStreamChat.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await navigateToPageType(page, home);
			// The feature only includes live, so leaving it must drop the class again.
			await expectBodyWithoutClass(page, bodyClass);
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`persists hide after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideLiveStreamChat.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await reloadPage(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideLiveStreamChat.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await disableFeature(page, "hideLiveStreamChat.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await expectElementsNotHidden(page, selectors, { mode: "any" });
			await enableFeature(page, "hideLiveStreamChat.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	test("removes the hide when SPA-navigating from a live stream to a VOD", async ({ page }) => {
		await navigateToPageType(page, live);
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		// The other navigation tests all reload the document; this one stays in the same one, so the includePages
		// gate and onDisable's "is the player still live" branch are the only things that can drop the class.
		await spaNavigateToRelatedVod(page);
		await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
	});

	test(`should not add body class on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithoutClass(page, bodyClass);
	});
});
