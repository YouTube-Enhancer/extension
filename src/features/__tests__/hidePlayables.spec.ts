import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { hasAnyMatch } from "@/src/utils/_tests/dom";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToFirstVideo, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { loginRequiredPages } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hidePlayables: { bodyClass, selectors }
} = hideFeatureSelectors;

const { home, watch } = pageTypeRecord;
// The feature declares no includePages, so resolvePageTypes would return all 11 pages; the CSS only matches home-feed markup,
// so home carries the behaviour and watch is kept as a second page to prove the body class is not home-only.
const testPages: readonly PageType[] = [home, watch];

const playablesHostId = "yte-test-playables-host";
const playablesControlSelector = `#${playablesHostId} ytd-rich-section-renderer.yte-test-playables-control`;
/** The feature selector scoped to the injected host, so no assertion can accidentally observe YouTube's own markup. */
const injectedSelectors = selectors.map((selector) => `#${playablesHostId} ${selector}`);

/**
 * Fails when the scoped selector matches nothing. Without it a stale synthetic markup block would make the display
 * assertions iterate over zero elements and pass without ever looking at the feature's effect.
 */
async function expectInjectedSelectorsToMatch(page: Page): Promise<void> {
	const unmatched = await page.evaluate((scoped) => scoped.filter((selector) => document.querySelector(selector) === null), [...injectedSelectors]);
	expect(unmatched).toEqual([]);
}
/**
 * The playables shelf is only served on some home feeds, so a synthetic one is injected next to a rich section that
 * links elsewhere. The sibling proves the rule only hits the shelf that links to /playables.
 *
 * YouTube runs Polymer with ShadyDOM, so `ytd-rich-section-renderer` stamps its own template into its light DOM the
 * moment it is connected and drops whatever children were parsed into it beforehand. Each section is therefore
 * connected first and only given its link once it is upgraded.
 */
async function injectPlayablesShelf(page: Page): Promise<void> {
	await page.evaluate((hostId) => {
		const addSection = (parent: Element, className: string, href: string, label: string): void => {
			const section = document.createElement("ytd-rich-section-renderer");
			if (className) section.className = className;
			parent.appendChild(section);
			// Outside the home feed YouTube gives the section no box of its own, so the stand-in is forced visible.
			// The feature's `display: none !important` has to beat this inline display for the hide to register.
			section.style.display = "block";
			section.insertAdjacentHTML("beforeend", `<a href="${href}">${label}</a>`);
		};
		const host = document.createElement("div");
		host.id = hostId;
		document.body.appendChild(host);
		addSection(host, "", "/playables", "Playables");
		addSection(host, "yte-test-playables-control", "/gaming", "Gaming");
	}, playablesHostId);
}

test.describe("hidePlayables", () => {
	for (const pageType of testPages) {
		test(`hides playables section on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePlayables.enabled");
			await expectBodyWithClass(page, bodyClass);
			// The playables shelf is only served on some home feeds; without it the display assertion below would
			// iterate over nothing and pass without checking anything.
			test.skip(!(await hasAnyMatch(page, selectors)), "fixture has no playables shelf");
			await expectElementsHidden(page, selectors, { requireMatch: true });
		});
	}

	// The shelf only ever ships on the home feed, but home needs a login the headless run does not have and the feature
	// declares no includePages, so the body class and its rule apply on watch just the same. Injecting there keeps the
	// selector covered in a logged-out run instead of skipping the only test that exercises the rule itself.
	test("hides an injected playables shelf and leaves sibling rich sections visible on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "hidePlayables.enabled");
		await injectPlayablesShelf(page);
		await expectInjectedSelectorsToMatch(page);
		// Baseline: the shelf is visible before the feature runs, so the hidden assertion below can only be its doing.
		await expectElementsNotHidden(page, injectedSelectors);
		await enableFeature(page, "hidePlayables.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, injectedSelectors);
		// The sibling rich section links elsewhere, so the `:has(a[href="/playables"])` guard has to spare it.
		await expectElementsNotHidden(page, [playablesControlSelector], { requireMatch: true });
	});
	test("keeps the hide across in-page navigation to a video and back on home", async ({ page }) => {
		test.skip(!hasAuthState(), "home requires login");
		await navigateToPageType(page, home);
		await enableFeature(page, "hidePlayables.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		// Real SPA hops, so the navigation manager recomputes the signature and re-runs the include/exclude gate.
		// The feature declares no includePages, so the class has to survive both directions.
		await spaNavigateToFirstVideo(page);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await spaNavigateToHome(page);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	});

	// onEnable/onDisable only add/remove a body class and no page gating exists, so the remaining cycles run on home only.
	test("shows playables section when disabled on home", async ({ page }) => {
		test.skip(!hasAuthState(), "home requires login");
		await navigateToPageType(page, home);
		await disableFeature(page, "hidePlayables.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
	});
	test("persists hide after full page reload on home", async ({ page }) => {
		test.skip(!hasAuthState(), "home requires login");
		await navigateToPageType(page, home);
		await enableFeature(page, "hidePlayables.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await page.reload();
		await navigateToPageType(page, home);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});
	test("re-applies after disable then re-enable on home", async ({ page }) => {
		test.skip(!hasAuthState(), "home requires login");
		await navigateToPageType(page, home);
		await enableFeature(page, "hidePlayables.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await disableFeature(page, "hidePlayables.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
		await enableFeature(page, "hidePlayables.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
	});
});
