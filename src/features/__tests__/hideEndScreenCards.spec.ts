import { type Page } from "@playwright/test";
import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";
import type { YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/hideEndScreenCards/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getValueFromYouTubePlayer } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const { home, watch } = pageTypeRecord;

const {
	hideEndScreenCards: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

/** Seeks to just before the end of the video so YouTube renders the end screen cards this feature targets. */
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

test.describe("hideEndScreenCards", () => {
	for (const pageType of testPages) {
		test(`hides end screen cards on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			// The end screen only renders in the last seconds of the video; without it no element matches and the
			// hidden assertion below would pass without ever looking at an element.
			await showEndScreen(page, pageType);
			await expectElementsHidden(page, selectors, { requireMatch: true });
		});
		test(`hides end screen cards after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
			await navigateToPageType(page, home);
			// The feature only includes watch, so leaving it must drop the class again.
			await expectBodyWithoutClass(page, bodyClass);
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`hides end screen cards on re-enable after disable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await disableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
	}

	test(`persists hide after full page reload on target pages`, async ({ page }) => {
		await navigateToPageType(page, testPages[0], ["endScreenCards"]);
		await enableFeature(page, "hideEndScreenCards.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
		await page.reload();
		await navigateToPageType(page, testPages[0], ["endScreenCards"]);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});

	test(`should not hide end screen cards on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hideEndScreenCards.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
	});

	test.describe("feature conflicts", () => {
		test.describe("hideEndScreenCards vs automaticallyShowMoreVideosOnEndScreen", () => {
			test("hideEndScreenCards CSS class is applied when both are enabled on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await enableFeature(page, "hideEndScreenCards.enabled");
				await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
				await expectBodyWithClass(page, bodyClass);
			});
		});
	});
});
