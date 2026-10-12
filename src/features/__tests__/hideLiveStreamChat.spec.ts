import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/hideLiveStreamChat/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden,
	expectElementsNotHidden
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import {
	navigateToPageType,
	reloadPage,
	waitForExtensionReady
} from "@/src/utils/_tests/navigation";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { resolveNonTargetPage } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideLiveStreamChat: { bodyClass, selectors }
} = hideFeatureSelectors;

const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, live, watch } = pageTypeRecord;
/**
 * The feature's apply retry budgets 120 s (40 attempts x 3 s) so a live pre-roll ad can exhaust it;
 * every assertion that waits for the product to add or drop the class has to outlast that budget.
 */
const LIVE_APPLY_TIMEOUT = 130_000;

/**
 * The feature hides only when the player reports the page's video as live, so the mode assertions that expect a
 * hide run on the live page type, where the navigation helper hunts an actual live stream. The watch fixtures are
 * all VODs, so watch asserts the other side: the isLive gate must keep the class off in every mode.
 */
/** Whether the player currently reports a live stream, which is what the feature branches on. */
async function isPlayingLive(page: Page): Promise<boolean> {
	return page.evaluate(async () => {
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		const data = await player?.getVideoData?.();
		return data?.isLive === true;
	});
}
/**
 * In-page navigation from a live stream to a related video that is not itself live. watch is inside includePages
 * now, so the page-type gate no longer disables the feature on this hop: the class can only drop through
 * onNavigate's live re-check on the same player.
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
	await waitForExtensionReady(page);
	await waitForYoutubePlayerReady(page, watch);
	// The destination must really be a VOD, otherwise the class staying on proves nothing about the re-check.
	await expect.poll(async () => isPlayingLive(page), { timeout: 15000 }).toBe(false);
}

test.describe("hideLiveStreamChat", () => {
	test(`hides live stream chat on ${live}`, async ({ page }) => {
		// Live hunt plus a worst-case 130 s apply wait (pre-roll ads) have to fit.
		test.setTimeout(300_000);
		await navigateToPageType(page, live);
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
	});
	test(`hides live stream chat after navigation on ${live}`, async ({ page }) => {
		// Live hunt plus a worst-case 130 s apply wait (pre-roll ads) have to fit.
		test.setTimeout(300_000);
		await navigateToPageType(page, live);
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
		await navigateToPageType(page, home);
		// home is in neither includePages entry, so leaving both must drop the class through the disable path.
		await expectBodyWithoutClass(page, bodyClass);
		await navigateToPageType(page, live);
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
	});
	test(`persists hide after full page reload on ${live}`, async ({ page }) => {
		// Live hunt plus a worst-case 130 s apply wait (pre-roll ads) have to fit.
		test.setTimeout(300_000);
		await navigateToPageType(page, live);
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
		await reloadPage(page, live);
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
	});
	test(`re-applies after disable then re-enable on ${live}`, async ({ page }) => {
		// Live hunt plus a worst-case 130 s apply wait (pre-roll ads) have to fit.
		test.setTimeout(300_000);
		await navigateToPageType(page, live);
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
		await disableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors, { mode: "any" });
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
	});
	test(`switches between always and fullscreen modes on ${live}`, async ({ page }) => {
		// Live hunt plus a worst-case 130 s apply wait (pre-roll ads) have to fit.
		test.setTimeout(300_000);
		await navigateToPageType(page, live);
		// The hide appearing first is the proof that the live check ran; the mode assertions below build on it.
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await setOption(page, "hideLiveStreamChat.mode", "fullscreen");
		// Outside fullscreen the fullscreen mode must show the chat again, without a disable round trip.
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors, { mode: "any" });
		await setOption(page, "hideLiveStreamChat.mode", "always");
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
	});
	test(`hides on fullscreen change and re-shows on exit in fullscreen mode`, async ({ page }) => {
		// The live hunt plus a worst-case 130 s apply wait both have to fit.
		test.setTimeout(300_000);
		await navigateToPageType(page, live);
		// Enable in the default always mode so the class proves the live check ran, then narrow to fullscreen mode.
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await setOption(page, "hideLiveStreamChat.mode", "fullscreen");
		await expectBodyWithoutClass(page, bodyClass);
		await toggleFullscreen(page, true);
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
		await toggleFullscreen(page, false);
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors, { mode: "any" });
	});
	test(`does not hide a VOD on ${watch} in either mode`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideLiveStreamChat.enabled");
		// The watch fixtures are all VODs, so the isLive gate decides before the mode does.
		await expectBodyWithoutClass(page, bodyClass);
		await setOption(page, "hideLiveStreamChat.mode", "fullscreen");
		await expectBodyWithoutClass(page, bodyClass);
		// Even in fullscreen, a non-live video must not hide: the live check outranks the fullscreen check.
		await toggleFullscreen(page, true);
		await expectBodyWithoutClass(page, bodyClass);
		await toggleFullscreen(page, false);
		await expectBodyWithoutClass(page, bodyClass);
	});

	test("removes the hide when SPA-navigating from a live stream to a VOD", async ({ page }) => {
		// Live hunt plus a worst-case 130 s apply wait (pre-roll ads) have to fit.
		test.setTimeout(300_000);
		await navigateToPageType(page, live);
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
		await expectElementsHidden(page, selectors);
		// The other navigation tests all reload the document; this one stays in the same one and lands on a watch
		// page that is still inside includePages, so only onNavigate's live re-check can drop the class.
		await spaNavigateToRelatedVod(page);
		await expectBodyWithoutClass(page, bodyClass, { timeout: LIVE_APPLY_TIMEOUT });
	});

	test(`should not add body class on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hideLiveStreamChat.enabled");
		await expectBodyWithoutClass(page, bodyClass);
	});
});
