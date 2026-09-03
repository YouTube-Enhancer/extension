import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/hidePlaylistRecommendationsFromHomePage/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden,
	expectElementsNotHidden,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToFirstVideo, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { loginRequiredPages, resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hidePlaylistRecommendationsFromHomePage: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, watch } = pageTypeRecord;

/** A regular home feed video tile, i.e. one the feature's `:has(yt-collection-thumbnail-view-model)` rule must not match. */
// Home tiles come in the classic renderer (a#video-title-link) and the lockup layout (yt-lockup-view-model).
const regularTileSelector =
	'ytd-browse[page-subtype="home"] ytd-rich-item-renderer:has(a#video-title-link, yt-lockup-view-model a[href^="/watch?v="]):not(:has(yt-collection-thumbnail-view-model))';

/** A single read would sample before the feature could have added the class, so hold the expectation for a settle window. */
async function expectBodyClassToStayAbsent(page: Page): Promise<void> {
	await expectToStay(async () => page.evaluate((className) => document.body.classList.contains(className), bodyClass), false, { page });
}

test.describe("hidePlaylistRecommendationsFromHomePage", () => {
	for (const pageType of testPages) {
		test(`hides playlist recommendations on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await expectBodyWithoutClass(page, bodyClass);
			await enableFeature(page, "hidePlaylistRecommendationsFromHomePage.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
		test(`hides elements after navigation on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePlaylistRecommendationsFromHomePage.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
			// The feature is gated to home by includePages, so leaving the page type must drop the class again.
			await navigateToPageType(page, watch);
			await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`persists hide after full page reload on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePlaylistRecommendationsFromHomePage.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePlaylistRecommendationsFromHomePage.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await disableFeature(page, "hidePlaylistRecommendationsFromHomePage.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await expectElementsNotHidden(page, selectors);
			await enableFeature(page, "hidePlaylistRecommendationsFromHomePage.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	test(`keeps non-collection home tiles visible when enabled`, async ({ page }) => {
		test.skip(!hasAuthState() && loginRequiredPages.includes(home), `${home} requires login`);
		await navigateToPageType(page, home);
		await enableFeature(page, "hidePlaylistRecommendationsFromHomePage.enabled");
		await expectBodyWithClass(page, bodyClass);
		// Nothing else pins the selector's narrowness: a rule widened to every ytd-rich-item-renderer would empty the feed
		// and still satisfy every hidden-elements assertion in this spec.
		const sampleTiles = async () =>
			page.evaluate((selector) => {
				const sampled = Array.from(document.querySelectorAll<HTMLElement>(selector)).slice(0, 12);
				return { hidden: sampled.filter((tile) => getComputedStyle(tile).display === "none").length, total: sampled.length };
			}, regularTileSelector);
		let tiles = await sampleTiles();
		for (let attempt = 0; attempt < 5 && tiles.total === 0; attempt++) {
			await page.waitForTimeout(1000);
			tiles = await sampleTiles();
		}
		// A logged-out session is served an empty home feed, so there is no tile to prove the selector's narrowness
		// with. Skipping keeps that visible in the report instead of failing on missing fixture data.
		test.skip(tiles.total === 0, "home feed lists no video tiles");
		expect(tiles.hidden).toBe(0);
	});
	test(`drops the hide class when SPA navigating off home and restores it on return`, async ({ page }) => {
		test.skip(!hasAuthState() && loginRequiredPages.includes(home), `${home} requires login`);
		await navigateToPageType(page, home);
		await enableFeature(page, "hidePlaylistRecommendationsFromHomePage.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		// In-page navigation drives yt-navigate-start/finish, so the includePages gate is re-evaluated without a document load.
		await spaNavigateToFirstVideo(page);
		await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
		await spaNavigateToHome(page);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});
	test(`should not hide playlist recommendations on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hidePlaylistRecommendationsFromHomePage.enabled");
		await expectBodyClassToStayAbsent(page);
	});
});
