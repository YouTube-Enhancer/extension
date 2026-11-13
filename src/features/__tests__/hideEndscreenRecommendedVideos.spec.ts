import type { Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/hideEndscreenRecommendedVideos/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden,
	expectElementsNotHidden
} from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { showEndScreen } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
import {
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
			await navigateToPageType(page, pageType);
			// automaticallyShowMoreVideosOnEndScreen hides the same grid under its own body class;
			// its config can persist from earlier tests in this worker, so turn it off explicitly.
			await disableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await showEndScreen(page, pageType);
			// YouTube keeps the grid hidden until the end screen actually pops; without a rendered
			// end screen "not hidden" cannot be distinguished from YouTube's own hidden state.
			const grid = page.locator("div.ytp-fullscreen-grid").first();
			const gridVisible = await grid
				.waitFor({ state: "visible", timeout: 15000 })
				.then(() => true)
				.catch(() => false);
			test.skip(!gridVisible, "the end screen did not render on this video");
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
