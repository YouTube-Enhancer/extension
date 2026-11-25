import type { Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";
import type { YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/hideEndscreenRecommendedVideos/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden,
	expectElementsNotHidden
} from "@/src/utils/_tests/assertions";
import { turnOffAutoPlay } from "@/src/utils/_tests/autoPlay";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { getValueFromYouTubePlayer, showEndScreen } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
import {
	expect,
	test,
	verifyNavigationPersistence,
	verifyNonTargetSilence,
	verifyReEnableCycle,
	verifyReloadPersistence
} from "@/tests/harness";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideEndscreenRecommendedVideos: { bodyClass, selectors }
} = hideFeatureSelectors;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

/**
 * One attempt at getting the player to the end, mirroring the sibling spec's `isAtEndScreen`
 * (automaticallyShowMoreVideosOnEndScreen:31-43): seeks back to the end when the video is playing
 * from somewhere else and resumes it when it is paused, then reports whether ended-mode is up.
 *
 * Both nudges have to be repeated rather than done once: only muted playback may be started from a
 * script, and the error watcher in pageSetup reloads the page when YouTube errors out, which puts
 * the video back at the start.
 */
async function isAtEndScreen(page: Page, target: number): Promise<boolean> {
	return page.evaluate(async (seekTarget) => {
		const isEnded = () => document.querySelector("#movie_player.ended-mode") !== null;
		if (isEnded()) return true;
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		const video = document.querySelector<HTMLVideoElement>(".html5-main-video");
		if (!player || !video) return false;
		video.muted = true;
		if (video.currentTime < seekTarget - 5) await player.seekTo(seekTarget, true);
		if (video.paused) await video.play().catch(() => {});
		return isEnded();
	}, target);
}
/**
 * Budget for one ad-drain pass inside the ended-mode poll. `pageSetup` owns its own (much larger)
 * budgets for the navigation pass; this one is named here because it is spent mid-test, against the
 * same selectors and with the same approach - seek the ad's video to its end so YouTube moves on,
 * then click skip as soon as the countdown allows it - and it has to stay small enough that a stuck
 * ad cannot eat the poll's whole 20 s budget.
 */
const AD_DRAIN_BUDGET_MS = 5_000;
/** Drains whatever ad is on screen the way `pageSetup` does, bounded by {@link AD_DRAIN_BUDGET_MS}. */
async function drainAds(page: Page): Promise<void> {
	const deadline = Date.now() + AD_DRAIN_BUDGET_MS;
	const adShowing = page.locator("#movie_player.ad-showing");
	const skipButton = page
		.locator(".ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern")
		.first();
	// Ads in a pod follow each other, so the pass keeps going until no ad is showing instead of
	// assuming the first one seen was the only one.
	while ((await adShowing.count()) > 0 && Date.now() < deadline) {
		await page
			.evaluate(() => {
				const video = document.querySelector<HTMLVideoElement>("#movie_player.ad-showing video");
				if (!video) return;
				const { duration } = video;
				if (!Number.isFinite(duration) || duration <= 0) return;
				video.muted = true;
				video.currentTime = duration;
				if (video.paused) void video.play().catch(() => {});
			})
			.catch(() => {});
		// The button is visible, but inert, while it counts down; a failed click just retries
		// on the next tick.
		if (await skipButton.isVisible().catch(() => false)) {
			await skipButton.click({ force: true, timeout: 1000 }).catch(() => {});
		}
		await page.waitForTimeout(500);
	}
}

test.describe("hideEndscreenRecommendedVideos", () => {
	const assertOn = async (page: Page) => {
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	};
	const assertOff = async (page: Page) => {
		await expectBodyWithoutClass(page, bodyClass);
	};
	const subject = { assertOff, assertOn };
	// The reload/re-enable legs prove the hidden-elements effect too, which needs a rendered end screen first.
	const assertOnWithEndScreen = (pageType: PageType) => async (page: Page) => {
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await showEndScreen(page, pageType);
		await expectElementsHidden(page, selectors, { requireMatch: true });
	};

	for (const pageType of testPages) {
		test(`hides endscreen recommended videos on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideEndscreenRecommendedVideos.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			// The end screen only renders in the last seconds of the video; without it no element matches and the
			// hidden assertion below would pass without ever looking at an element.
			await showEndScreen(page, pageType);
			await expectElementsHidden(page, selectors, { requireMatch: true });
		});
		test(`does not hide endscreen recommended videos by default on ${pageType}`, async ({
			page
		}) => {
			// The endScreenCards fixture is what guarantees a video long enough for YouTube to render
			// an end screen at all; without it the grid wait below is a coin flip on the fixture.
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			// automaticallyShowMoreVideosOnEndScreen hides the same grid under its own body class;
			// its config can persist from earlier tests in this worker, so turn it off explicitly.
			await disableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			// With autoplay on YouTube leaves the video for the next one the moment it ends, so the
			// end screen would never be on screen to assert on (same reason the sibling
			// automaticallyShowMoreVideosOnEndScreen:162-164 turns it off).
			await turnOffAutoPlay(page);
			await showEndScreen(page, pageType);
			// The grid is only painted once the player is in ended-mode, and the hardened trigger
			// above leaves the playhead at duration-2 where an ad pod or a stalled playhead can hold
			// it short of the end (probe: frozen at duration-2 for 18 s, grid absent; a nudge into
			// ended-mode rendered it immediately). So nudge the player to the end first, mirroring
			// the sibling spec's isAtEndScreen, draining any ad mid-wait the way pageSetup does.
			// Two attempts rather than one: pageSetup's error watcher reloads the page when YouTube
			// reports a playback error, and that reload puts the video back at the start, dropping
			// ended-mode and the grid together (verify3 trace: the ended-mode poll never turned
			// true, the watcher reloaded at +42 s, the playhead read 0:02, the grid wait expired).
			// A pass that finds no grid therefore nudges the fresh page once more before the test
			// decides it has nothing to assert on.
			const duration = (await getValueFromYouTubePlayer(page, "getDuration", pageType)) ?? 0;
			const target = Math.max(0, duration - 1);
			const grid = page.locator("div.ytp-fullscreen-grid").first();
			let reachedEndedMode = false;
			let gridVisible = false;
			for (let attempt = 0; attempt < 2 && !gridVisible; attempt++) {
				try {
					await expect
						.poll(
							async () => {
								await drainAds(page);
								return isAtEndScreen(page, target);
							},
							{ intervals: [1000], timeout: attempt === 0 ? 20000 : 15000 }
						)
						.toBe(true);
					reachedEndedMode = true;
				} catch {
					// Not reaching ended-mode is not itself a failure: the grid wait decides.
				}
				// YouTube keeps the grid hidden until the end screen actually pops; without a
				// rendered end screen "not hidden" cannot be distinguished from YouTube's own
				// hidden state. Cards are confirmed present in the final 20 s and rendering or
				// buffering can lag under load, so the wait outlasts that window.
				gridVisible = await grid
					.waitFor({ state: "visible", timeout: attempt === 0 ? 25000 : 15000 })
					.then(() => true)
					.catch(() => false);
			}
			// A grid that never rendered skips however the nudge went. The old guard also demanded
			// ended-mode, so a page the error watcher had already reloaded fell through to the
			// assertion below and failed on an element YouTube itself keeps at display:none.
			test.skip(
				!gridVisible,
				reachedEndedMode
					? "the player reached ended mode but the end screen grid never rendered"
					: "the player never reached ended mode, so the end screen grid never rendered"
			);
			await expectElementsNotHidden(page, selectors, { requireMatch: true });
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await verifyReloadPersistence(page, pageType, "hideEndscreenRecommendedVideos", {
				...subject,
				assertOn: assertOnWithEndScreen(pageType)
			});
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await verifyReEnableCycle(page, pageType, "hideEndscreenRecommendedVideos", {
				...subject,
				assertOn: assertOnWithEndScreen(pageType)
			});
		});
		test(`hides endscreen recommended videos after navigation on ${pageType}`, async ({ page }) => {
			// A genuine in-page navigation to another watch page, so the includePages gate runs through
			// the navigation manager instead of a fresh document load re-running onEnable. The body
			// class is the feature's whole effect; the hidden-elements assertion is not repeated because
			// the end screen of the new video may never render (the by-default case skips in that state).
			await verifyNavigationPersistence(
				page,
				pageType,
				"hideEndscreenRecommendedVideos",
				subject,
				(navPage) => spaNavigateToRelatedVideo(navPage)
			);
		});
	}

	test(`should not hide endscreen recommended videos on non-target page`, async ({ page }) => {
		await verifyNonTargetSilence(page, nonTargetPage!, "hideEndscreenRecommendedVideos", subject);
	});
});
