import type { Page } from "@playwright/test";

import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";
import type { YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/hideEndscreenRecommendedVideos/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getValueFromYouTubePlayer } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const { hideEndscreenRecommendedVideos: { bodyClass, selectors } } = hideFeatureSelectors;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

async function showEndScreen(page: Page, pageType: PageType): Promise<void> {
	const duration = (await getValueFromYouTubePlayer(page, "getDuration", pageType)) ?? 0;
	await page.evaluate(
		async (seconds) => {
			const player = document.querySelector<YouTubePlayerDiv>("#movie_player");
			if (!player) return;
			await player.seekTo(seconds, true);
			await player.playVideo();
		},
		Math.max(0, duration - 2)
	);
}

test.describe("hideEndscreenRecommendedVideos", () => {
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
		test(`does not hide endscreen recommended videos by default on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await expectBodyWithoutClass(page, bodyClass);
			await showEndScreen(page, pageType);
			await expectElementsNotHidden(page, selectors, { requireMatch: true });
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideEndscreenRecommendedVideos.enabled");
			await expectBodyWithClass(page, bodyClass);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await showEndScreen(page, pageType);
			await expectElementsHidden(page, selectors, { requireMatch: true });
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideEndscreenRecommendedVideos.enabled");
			await expectBodyWithClass(page, bodyClass);
			await disableFeature(page, "hideEndscreenRecommendedVideos.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await enableFeature(page, "hideEndscreenRecommendedVideos.enabled");
			await expectBodyWithClass(page, bodyClass);
			await showEndScreen(page, pageType);
			await expectElementsHidden(page, selectors, { requireMatch: true });
		});
	}

	test(`should not hide endscreen recommended videos on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hideEndscreenRecommendedVideos.enabled");
		await expectBodyWithoutClass(page, bodyClass);
	});
});
