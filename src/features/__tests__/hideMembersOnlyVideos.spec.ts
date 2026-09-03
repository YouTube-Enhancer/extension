import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateBack, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { loginRequiredPages } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideMembersOnlyVideos: { bodyClass: rawBodyClass, selectors }
} = hideFeatureSelectors;
const bodyClass = rawBodyClass.replace(/:not\(.*?\)$/, "");

const { channel_home, channel_videos, home, search, watch } = pageTypeRecord;
// The feature declares no includePages, so resolvePageTypes would return all 11 pages; only these fixtures can render the
// rich grid, item-section shelf and lockup markup the selectors target, on the rest the element assertions match nothing.
const testPages: readonly PageType[] = [home, watch, search, channel_home, channel_videos];
// Navigation and reload have no page-specific branch (one body class, no dependencies): one player page and one list page suffice.
const transitionPages: readonly PageType[] = [watch, search];

const membersHostId = "yte-test-members-only-host";
const sponsorshipsHubId = "yte-test-sponsorships-hub";
const membersControlSelector = `#${membersHostId} .yte-test-members-control`;
/** Every feature selector scoped to the injected host, so no assertion can accidentally observe YouTube's own markup. */
const injectedSelectors = selectors.map((selector) => `#${membersHostId} ${selector}`);
const [firstSelector] = selectors;
/** Taken from the generated selector so the synthetic badge carries exactly the glyph the feature CSS looks for. */
const [, memberBadgeGlyph = ""] = /path\[d="([^"]+)"\]/.exec(firstSelector) ?? [];

/**
 * Fails when one of the scoped selectors matches nothing. Without it a stale synthetic markup block would make the
 * display assertions iterate over zero elements and pass without ever looking at the feature's effect.
 */
async function expectInjectedSelectorsToMatch(page: Page): Promise<void> {
	const unmatched = await page.evaluate((scoped) => scoped.filter((selector) => document.querySelector(selector) === null), [...injectedSelectors]);
	expect(unmatched).toEqual([]);
}
/**
 * Members-only videos only appear for channels the account is a member of, so one synthetic item per generated
 * selector is injected instead. The trailing control element matches none of them and proves the rule stays scoped.
 *
 * YouTube runs Polymer with ShadyDOM, so `ytd-rich-item-renderer`, `ytd-item-section-renderer` and
 * `yt-horizontal-list-renderer` stamp their own template into their light DOM the moment they are connected and drop
 * whatever children were parsed into them beforehand. Each custom element is therefore connected first and only
 * given its badge once it is upgraded.
 */
async function injectMembersOnlyMarkup(page: Page): Promise<void> {
	await page.evaluate(
		({ glyph, hostId }) => {
			const addChild = (parent: Element, tag: string): HTMLElement => {
				const element = document.createElement(tag);
				parent.appendChild(element);
				// YouTube's own stylesheet gives some of these no box of their own, so the stand-ins are forced
				// visible. The feature's `display: none !important` has to beat this inline display to register.
				element.style.display = "block";
				return element;
			};
			const addBadge = (parent: Element): void => parent.insertAdjacentHTML("beforeend", `<svg><path d="${glyph}"></path></svg>`);
			const host = document.createElement("div");
			host.id = hostId;
			document.body.appendChild(host);
			addBadge(addChild(host, "ytd-rich-item-renderer"));
			addBadge(addChild(addChild(host, "ytd-item-section-renderer"), "yt-horizontal-list-renderer"));
			addBadge(addChild(host, "yt-lockup-view-model"));
			host.insertAdjacentHTML("beforeend", `<span class="yte-test-members-control"></span>`);
		},
		{ glyph: memberBadgeGlyph, hostId: membersHostId }
	);
}

test.describe("hideMembersOnlyVideos", () => {
	for (const pageType of testPages) {
		test(`hides members only videos on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideMembersOnlyVideos.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	for (const pageType of transitionPages) {
		test(`hides elements after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideMembersOnlyVideos.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`persists hide after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideMembersOnlyVideos.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
	}

	test("hides an injected members only item for every generated selector on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "hideMembersOnlyVideos.enabled");
		await injectMembersOnlyMarkup(page);
		await expectInjectedSelectorsToMatch(page);
		// Baseline: nothing the feature targets is hidden before it runs, so the hidden assertion below can only be its doing.
		await expectElementsNotHidden(page, injectedSelectors);
		await enableFeature(page, "hideMembersOnlyVideos.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, injectedSelectors);
		// A sibling matching none of the selectors must keep its display, so the rule cannot be hiding the whole subtree.
		await expectElementsNotHidden(page, [membersControlSelector], { requireMatch: true });
	});
	test("keeps members only items visible while a sponsorships hub is on the page on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideMembersOnlyVideos.enabled");
		await expectBodyWithClass(page, bodyClass);
		await injectMembersOnlyMarkup(page);
		await expectInjectedSelectorsToMatch(page);
		await expectElementsHidden(page, injectedSelectors);
		// The feature scopes its whole rule to `:not(:has(yt-sponsorships-hub))`, i.e. it deliberately stops hiding on
		// membership hub views. The generated bodyClass strips that guard, so nothing else in the spec exercises it.
		await page.evaluate((hubId) => {
			const hub = document.createElement("yt-sponsorships-hub");
			hub.id = hubId;
			document.body.appendChild(hub);
		}, sponsorshipsHubId);
		await expectElementsNotHidden(page, injectedSelectors);
		await page.evaluate((hubId) => document.getElementById(hubId)?.remove(), sponsorshipsHubId);
		await expectElementsHidden(page, injectedSelectors);
	});
	test("keeps the hide across in-page navigation to home and back on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideMembersOnlyVideos.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		// Real SPA hops, so the navigation manager recomputes the signature and re-runs the include/exclude gate.
		// The feature declares no includePages, so the class has to survive both directions.
		await spaNavigateToHome(page);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await spaNavigateBack(page, "watch");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	});

	test("re-applies after disable then re-enable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideMembersOnlyVideos.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await disableFeature(page, "hideMembersOnlyVideos.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
		await enableFeature(page, "hideMembersOnlyVideos.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
	});
});
