import { type FrameLocator, type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import type { Nullable } from "@/src/types";

import { metadata } from "@/src/features/hideArtificialIntelligence/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateBack, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { loginRequiredPages, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideArtificialIntelligence: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { home, live, watch } = pageTypeRecord;

const aiHostId = "yte-test-ai-host";
const chatBannerId = "yte-test-live-chat-ai-banner";
const chatControlId = "yte-test-live-chat-control";
/** Id of the style element the feature injects into the chat document; inlined so the spec does not have to
 * import the feature module (which touches browser only globals) into the Node side of the test. */
const chatStyleId = "yte-hide-ai-chat";
const aiControlSelector = `#${aiHostId} .yte-test-ai-control`;
const menuMarginHostId = "yte-test-menu-margin-host";
const menuMarginSelector = `#${menuMarginHostId} ytd-menu-renderer[has-items] yt-button-shape.ytd-menu-renderer`;
/** Every feature selector scoped to the injected host, so no assertion can accidentally observe YouTube's own markup. */
const injectedSelectors = selectors.map((selector) => `#${aiHostId} ${selector}`);
/** Taken from the generated selector so the synthetic button carries exactly the glyph the feature CSS looks for. */
const [, aiButtonGlyph = ""] = /path\[d="([^"]+)"\]/.exec(selectors.find((selector) => selector.startsWith("button-view-model")) ?? "") ?? [];

/**
 * Fails when one of the scoped selectors matches nothing. Without it a stale synthetic markup block would make the
 * display assertions iterate over zero elements and pass without ever looking at the feature's effect.
 */
async function expectInjectedSelectorsToMatch(page: Page, list: readonly string[]): Promise<void> {
	const unmatched = await page.evaluate((scoped) => scoped.filter((selector) => document.querySelector(selector) === null), [...list]);
	expect(unmatched).toEqual([]);
}
/**
 * Computed `display` of every element matching the feature selectors, in document order. Used as a baseline so the
 * disabled state can be compared against how the page looked before the feature ever ran, instead of assuming the
 * matched elements are visible (YouTube hides plenty of them for its own reasons).
 */
async function getSelectorDisplays(page: Page): Promise<string[]> {
	return page.evaluate(
		(list) =>
			list.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector), (element) => getComputedStyle(element).display)),
		[...selectors]
	);
}
/**
 * None of the 13 declared AI selectors reliably matches a real watch page, so one synthetic element per selector is
 * injected. The trailing control element matches none of them and proves the rule stays scoped.
 *
 * YouTube runs Polymer with ShadyDOM, so every `ytd-*` custom element stamps its own template into its light DOM the
 * moment it is connected and drops whatever children were parsed into it beforehand. Custom-element parents are
 * therefore connected first and only filled once they are upgraded, which is what `addChild` below does.
 *
 */
async function injectAiMarkup(page: Page): Promise<void> {
	await page.evaluate(
		({ glyph, hostId }) => {
			const addChild = (parent: Element, tag: string, attributes: Array<[string, string]> = []): HTMLElement => {
				const element = document.createElement(tag);
				for (const [name, value] of attributes) element.setAttribute(name, value);
				parent.appendChild(element);
				// YouTube's own stylesheet hides several of these by default (an engagement panel is stamped with
				// visibility="ENGAGEMENT_PANEL_VISIBILITY_HIDDEN", for one), so the stand-ins are forced visible. The
				// feature's `display: none !important` has to beat this inline display for the hide to register.
				element.style.display = "block";
				return element;
			};
			const host = document.createElement("div");
			host.id = hostId;
			document.body.appendChild(host);
			// Plain elements are never upgraded, so they can be parsed in one go.
			host.insertAdjacentHTML(
				"beforeend",
				`
					<div id="expandable-metadata"><span has-video-summary></span></div>
					<div id="video-summary"><span has-video-summary></span></div>
					<span class="ytSearchboxComponentReportButton"></span>
					<span class="ytSearchboxComponentAiSuggestionsContainer"></span>
					<span class="yte-test-ai-control"></span>
				`
			);
			addChild(host, "yt-button-view-model").insertAdjacentHTML("beforeend", `<span class="you-chat-entrypoint-button"></span>`);
			addChild(host, "yt-player-quick-action-buttons").insertAdjacentHTML("beforeend", `<span class="you-chat-entrypoint-button"></span>`);
			addChild(host, "ytd-engagement-panel-section-list-renderer", [["target-id", "PAyouchat"]]);
			addChild(host, "button-view-model").insertAdjacentHTML("beforeend", `<svg><path d="${glyph}"></path></svg>`);
			addChild(host, "yt-video-description-youchat-section-view-model");
			const chatFrame = addChild(host, "ytd-live-chat-frame");
			addChild(chatFrame, "yt-live-chat-banner-renderer");
			chatFrame.insertAdjacentHTML("beforeend", `<span class="yte-test-ai-summary"></span><span class="yte-test-generative"></span>`);
			addChild(chatFrame, "ytd-engagement-panel-section-list-renderer", [["target-id", "PAyouchat"]]);
		},
		{ glyph: aiButtonGlyph, hostId: aiHostId }
	);
}

/**
 * Appends the probe banner to the live chat document and reads back, in the same round trip, the display the chat
 * document computes for it. The live chat app strips foreign nodes out of its body within a few hundred ms, so a
 * banner appended by one call is already gone by the time a separate assertion looks for it - measuring inside the
 * same evaluate (and re-creating the probe on every poll) is what makes the check observable at all.
 *
 * `control` is an element no injected rule matches; without it a chat stylesheet that happened to hide unknown
 * elements would make the banner assertion pass for the wrong reason.
 */
async function measureChatBannerDisplay(
	chatFrame: FrameLocator
): Promise<Nullable<{ bannerHidden: boolean; controlHidden: boolean; hasStyle: boolean }>> {
	try {
		return await chatFrame.locator("body").evaluate(
			(body, { bannerId, controlId, styleId }) => {
				const { ownerDocument: chatDocument } = body;
				const probe = (id: string, tag: string): HTMLElement => {
					const existing = chatDocument.getElementById(id);
					if (existing) return existing;
					const created = chatDocument.createElement(tag);
					created.id = id;
					body.appendChild(created);
					return created;
				};
				const banner = probe(bannerId, "yt-live-chat-banner-renderer");
				const control = probe(controlId, "yte-test-live-chat-control");
				const displayOf = (element: HTMLElement) => chatDocument.defaultView?.getComputedStyle(element).display ?? "";
				return {
					bannerHidden: displayOf(banner) === "none",
					controlHidden: displayOf(control) === "none",
					hasStyle: chatDocument.getElementById(styleId) !== null
				};
			},
			{ bannerId: chatBannerId, controlId: chatControlId, styleId: chatStyleId }
		);
	} catch {
		// The chat frame can be between documents, which detaches the body handle; the next poll retries.
		return null;
	}
}
/**
 * The live fixture crawls the fixture channel for a stream that is on air right now. When the channel is dark
 * there is nothing to assert, which has to be a visible skip instead of a failure.
 */
async function navigateToLiveOrSkip(page: Page): Promise<void> {
	try {
		await navigateToPageType(page, live);
	} catch (error) {
		test.skip(true, `no live stream is currently available on the fixture channel (${error instanceof Error ? error.message : String(error)})`);
	}
}

test.describe("hideArtificialIntelligence", () => {
	for (const pageType of testPages) {
		test(`hides AI elements on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideArtificialIntelligence.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	test("hides every declared AI selector against synthetic markup on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "hideArtificialIntelligence.enabled");
		await injectAiMarkup(page);
		await expectInjectedSelectorsToMatch(page, injectedSelectors);
		// Baseline: nothing the feature targets is hidden before it runs, so the hidden assertion below can only be its doing.
		await expectElementsNotHidden(page, injectedSelectors);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, injectedSelectors);
		// A sibling matching none of the selectors must keep its display, so the rule cannot be hiding the whole subtree.
		await expectElementsNotHidden(page, [aiControlSelector], { requireMatch: true });
	});
	test("collapses the menu button margin when enabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "hideArtificialIntelligence.enabled");
		await page.evaluate((hostId) => {
			const host = document.createElement("div");
			host.id = hostId;
			document.body.appendChild(host);
			// ytd-menu-renderer stamps its own template - including the yt-button-shape the feature targets - into its
			// light DOM as soon as it is connected, so the element under test is YouTube's own and carries YouTube's
			// own spacing. A hand-written yt-button-shape child would be dropped by that same stamping.
			const menu = document.createElement("ytd-menu-renderer");
			menu.setAttribute("has-items", "");
			host.appendChild(menu);
		}, menuMarginHostId);
		const menuButton = page.locator(menuMarginSelector);
		await expect(menuButton).toBeAttached();
		// YouTube's own stylesheet spaces the button away from its neighbour; without that baseline the 0px below
		// would be indistinguishable from the button never having had a margin.
		const baselineMargin = await menuButton.evaluate((element) => getComputedStyle(element).marginLeft);
		expect(baselineMargin).not.toBe("0px");
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		// The margin rule is a second, separate declaration in the feature CSS and the only non-display effect it has.
		await expect(menuButton).toHaveCSS("margin-left", "0px");
	});
	test("hides the live chat AI summary banner inside the chat iframe on live", async ({ page }) => {
		await navigateToLiveOrSkip(page);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass);
		const chatFrame = page.frameLocator("ytd-live-chat-frame iframe#chatframe");
		// The chat DOM lives in a same-origin iframe the embedded script never runs in, so the feature injects its own
		// style element into the frame document instead of relying on the top document body class.
		await expect(chatFrame.locator(`style#${chatStyleId}`)).toBeAttached({ timeout: 15000 });
		// A real AI summary banner only shows up on some streams, so the banner is synthesised inside the chat
		// document. The live chat app removes foreign children of its body again within a few hundred ms, so the
		// probe has to be created and measured inside one evaluate rather than appended once and asserted on
		// separately - which is what made the previous version of this assertion look for a node that was gone.
		await expect
			.poll(async () => measureChatBannerDisplay(chatFrame), { timeout: 20000 })
			.toEqual({ bannerHidden: true, controlHidden: false, hasStyle: true });
	});

	// onEnable/onDisable only add/remove a body class and there is no onNavigate hook or page-specific branch,
	// so the navigation, reload and toggle cycles are exercised on watch only instead of on all 11 pages.
	test("hides elements after navigation on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});
	test("keeps the hide across in-page navigation to home and back on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		// Real SPA hops, so the navigation manager recomputes the signature and re-runs the include/exclude gate.
		// The feature declares no includePages, so the class has to survive both directions.
		await spaNavigateToHome(page);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await spaNavigateBack(page, "watch");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	});
	test("persists hide after full page reload on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await reloadPage(page, watch);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});
	test("re-applies after disable then re-enable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		const baselineDisplays = await getSelectorDisplays(page);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await disableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expect.poll(() => getSelectorDisplays(page)).toEqual(baselineDisplays);
		await enableFeature(page, "hideArtificialIntelligence.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
	});
});
