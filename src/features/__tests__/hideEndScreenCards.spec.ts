import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";
import type { YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/hideEndScreenCards/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden,
	expectElementsNotHidden,
	expectFeatureButtonToBeIn,
	expectToggleButtonState
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateBack, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { freezeAndGetTime, getValueFromYouTubePlayer } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const { home, watch } = pageTypeRecord;
const { right } = placementRecord;

const {
	hideEndScreenCards: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const buttonId = "yte-feature-hideEndScreenCardsButton-button";

/** Markup of the toggle icon currently inside the button, so an icon swap driven by onConfigChange is observable. */
async function getButtonIconMarkup(page: Page): Promise<string> {
	return page
		.locator(`#${buttonId} svg`)
		.first()
		.evaluate((icon) => icon.outerHTML);
}
/** True once YouTube has actually rendered an end screen card, instead of only keeping one in the DOM. */
async function hasRenderedEndScreenCard(page: Page): Promise<boolean> {
	return page.evaluate(
		(list) =>
			list.some((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)).some((el) => getComputedStyle(el).display !== "none")),
		[...selectors]
	);
}
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

	test("hides the end screen cards that are visible while the feature is off on watch", async ({ page }) => {
		await navigateToPageType(page, watch, ["endScreenCards"]);
		await disableFeature(page, "hideEndScreenCards.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await showEndScreen(page, watch);
		// Proving a card is rendered first is what makes the hidden assertion below falsifiable: YouTube keeps the
		// cards display:none until the end screen appears, so the feature could otherwise take credit for its markup.
		await expect.poll(async () => hasRenderedEndScreenCard(page), { timeout: 20000 }).toBe(true);
		// Freeze playback so the cards cannot vanish into the autoplay countdown mid-assertion.
		await freezeAndGetTime(page, watch);
		await enableFeature(page, "hideEndScreenCards.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors, { requireMatch: true });
	});

	test("removes the hide when SPA-navigating away from watch and restores it on return", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideEndScreenCards.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		// In-page hops, so the includePages gate runs through the navigation manager's yt-navigate listeners
		// instead of the fresh document load every other navigation test in this spec performs.
		await spaNavigateToHome(page);
		await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
		await spaNavigateBack(page, "watch");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	});

	test("swaps the button icon and title when the setting is toggled live on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "hideEndScreenCards.enabled");
		await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
		await setOption(page, "hideEndScreenCardsButton.button.placement", right);
		await expectFeatureButtonToBeIn(page, buttonId, right);
		await expect(page.locator(`#${buttonId}`)).toHaveAttribute("data-title", "Hide end screen cards");
		const iconWhileCardsShow = await getButtonIconMarkup(page);
		// onConfigChange is the only hook that reacts to the setting changing underneath an already placed button.
		await enableFeature(page, "hideEndScreenCards.enabled");
		await expect(page.locator(`#${buttonId}`)).toHaveAttribute("data-title", "Show end screen cards");
		expect(await getButtonIconMarkup(page)).not.toBe(iconWhileCardsShow);
		await disableFeature(page, "hideEndScreenCards.enabled");
		await expect(page.locator(`#${buttonId}`)).toHaveAttribute("data-title", "Hide end screen cards");
	});
	test("keeps the button aria-checked in sync when the setting is toggled live on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "hideEndScreenCards.enabled");
		await enableFeature(page, "hideEndScreenCardsButton.button.enabled");
		await setOption(page, "hideEndScreenCardsButton.button.placement", right);
		await expectFeatureButtonToBeIn(page, buttonId, right);
		// The button is placed unchecked while the cards are visible: aria-checked === true means the cards are hidden.
		await expectToggleButtonState(page, buttonId, false, { title: "Hide end screen cards" });
		await enableFeature(page, "hideEndScreenCards.enabled");
		await expectToggleButtonState(page, buttonId, true, { title: "Show end screen cards" });
		await disableFeature(page, "hideEndScreenCards.enabled");
		await expectToggleButtonState(page, buttonId, false, { title: "Hide end screen cards" });
	});

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
