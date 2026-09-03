import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/hideOfficialArtistVideosFromHomePage/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToFirstVideo, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { loginRequiredPages, resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideOfficialArtistVideosFromHomePage: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { channel_home, home } = pageTypeRecord;

const artistHostId = "yte-test-official-artist-host";
const artistControlSelector = `#${artistHostId} .yte-test-artist-control`;
/** The feature selector scoped to the injected host, so no assertion can accidentally observe YouTube's own markup. */
const injectedSelectors = selectors.map((selector) => `#${artistHostId} ${selector}`);
const [firstSelector] = selectors;
/** Taken from the generated selector so the synthetic card carries exactly the glyph the feature CSS looks for. */
const [, artistBadgeGlyph = ""] = /path\[d="([^"]+)"\]/.exec(firstSelector) ?? [];

/**
 * Fails when the scoped selector matches nothing. Without it a stale synthetic markup block would make the display
 * assertions iterate over zero elements and pass without ever looking at the feature's effect.
 */
async function expectInjectedSelectorsToMatch(page: Page): Promise<void> {
	const unmatched = await page.evaluate((scoped) => scoped.filter((selector) => document.querySelector(selector) === null), [...injectedSelectors]);
	expect(unmatched).toEqual([]);
}
/**
 * Official artist cards are only served on some home feeds, so a synthetic one is injected instead. The trailing
 * control element matches none of the selectors and proves the rule stays scoped.
 *
 * YouTube runs Polymer with ShadyDOM, so `ytd-rich-item-renderer` stamps its own template into its light DOM the
 * moment it is connected and drops whatever children were parsed into it beforehand. The card is therefore connected
 * first and only given its badge once it is upgraded.
 */
async function injectOfficialArtistMarkup(page: Page): Promise<void> {
	await page.evaluate(
		({ glyph, hostId }) => {
			const host = document.createElement("div");
			host.id = hostId;
			document.body.appendChild(host);
			const card = document.createElement("ytd-rich-item-renderer");
			host.appendChild(card);
			// Outside a rich grid YouTube gives the card no box of its own, so the stand-in is forced visible. The
			// feature's `display: none !important` has to beat this inline display for the hide to register.
			card.style.display = "block";
			card.insertAdjacentHTML("beforeend", `<svg><path d="${glyph}"></path></svg>`);
			host.insertAdjacentHTML("beforeend", `<span class="yte-test-artist-control"></span>`);
		},
		{ glyph: artistBadgeGlyph, hostId: artistHostId }
	);
}

test.describe("hideOfficialArtistVideosFromHomePage", () => {
	for (const pageType of testPages) {
		test(`adds the hide class on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
		test(`shows official artist videos when disabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await expectElementsNotHidden(page, selectors);
		});
		test(`hides elements after navigation on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
			await navigateToPageType(page, channel_home);
			// The feature only includes home, so leaving it must drop the class again.
			await expectBodyWithoutClass(page, bodyClass);
			await navigateToPageType(page, home);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`persists hide after full page reload on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
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
			await enableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await disableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await expectElementsNotHidden(page, selectors);
			await enableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	test("hides an injected official artist card and shows it again when disabled on home", async ({ page }) => {
		test.skip(!hasAuthState() && loginRequiredPages.includes(home), `${home} requires login`);
		await navigateToPageType(page, home);
		await disableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
		await injectOfficialArtistMarkup(page);
		await expectInjectedSelectorsToMatch(page);
		// Baseline: the card is visible before the feature runs, so the hidden assertion below can only be its doing.
		await expectElementsNotHidden(page, injectedSelectors);
		await enableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, injectedSelectors);
		// A sibling matching none of the selectors must keep its display, so the rule cannot be hiding the whole subtree.
		await expectElementsNotHidden(page, [artistControlSelector], { requireMatch: true });
		await disableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, injectedSelectors);
	});
	test("should not hide official artist videos on non-target page", async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		// The generated selector is not scoped to `ytd-browse[page-subtype="home"]`, so the includePages gate is the
		// only thing keeping an identical card visible off the home feed.
		await injectOfficialArtistMarkup(page);
		await expectInjectedSelectorsToMatch(page);
		await expectElementsNotHidden(page, injectedSelectors);
	});
	test("removes the hide when SPA-navigating away from home and restores it on return", async ({ page }) => {
		test.skip(!hasAuthState() && loginRequiredPages.includes(home), `${home} requires login`);
		await navigateToPageType(page, home);
		await enableFeature(page, "hideOfficialArtistVideosFromHomePage.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		// In-page hops, so the includePages gate runs through the navigation manager's yt-navigate listeners
		// instead of the fresh document load the other navigation test performs.
		await spaNavigateToFirstVideo(page);
		await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
		await spaNavigateToHome(page);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	});
});
