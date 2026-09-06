import { type Page } from "@playwright/test";
import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { BLOCKED_AVATAR_URL, isBlockedPlaceholderUrl } from "@/src/features/keywordBlocklist/blockedPlaceholder";
import { normalizeForMatch } from "@/src/features/keywordBlocklist/utils";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setFeatureValue } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateBack, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { loginRequiredPages } from "@/src/utils/_tests/utils";

const { channel_videos, home, search, watch } = pageTypeRecord;

const BLOCKED_ATTRIBUTE = "data-yte-keyword-blocked";
const HOVER_BLOCKED_CLASS = "yte-hover-blocked";
/** The en-US `pages.content.features.keywordBlocklist.messages.maskedTitle` string the feature writes over a title. */
const MASKED_TITLE = "Blocked keyword";
/** Marks a card the spec has read once, so later reads find the same element whatever the page re-orders. */
const CARD_ID_ATTRIBUTE = "data-yte-test-card";
/**
 * The subset of the feature's video containers and title targets (index.ts VIDEO_CONTAINER_SELECTOR and
 * TEXT_TARGET_SELECTOR) that the fixtures render. Cards nested in another card (a lockup inside a rich item) are
 * read through their outermost container only.
 */
const CARD_SELECTOR =
	"ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model, .ytp-videowall-still";
const TITLE_SELECTOR = "#video-title, a#video-title-link, .ytLockupMetadataViewModelTitle, .ytp-videowall-still-info-title";
const PLAYLIST_PANEL_ITEM_SELECTOR = "ytd-playlist-panel-video-renderer";
const INJECTED_CARD_ID = "yte-test-keyword-card";
const INJECTED_TITLE = "yte keyword blocklist probe card";
/** Three text nodes, so the restore has to put every node back rather than the joined text. */
const INJECTED_TITLE_HTML = "yte keyword <b>blocklist</b> probe card";
const INJECTED_THUMBNAIL = "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg";
const INJECTED_THUMBNAIL_LATE = "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg";
const INJECTED_AVATAR = "https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj";
const INJECTED_KEYWORD = "probe";
// The feature declares no includePages. One fixture per markup family: search results, watch related lockups,
// the channel grid and the signed-in home feed.
const maskingPages: readonly PageType[] = [search, watch, channel_videos, home];

type CardSnapshot = {
	blocked: boolean;
	/** Number of `title` and `aria-label` attributes on the title element, its anchor and its heading. */
	hostAttributes: number;
	id: string;
	images: ImageSnapshot[];
	title: string;
};
type ImageSnapshot = { src: null | string; srcset: null | string };
type InjectedSnapshot = { blocked: boolean; images: ImageSnapshot[]; texts: string[] };

/**
 * Picks the first titled card as the one to block, with its whole title as the keyword, and a second card whose
 * title does not contain that keyword as the control. Skips when the page offers no such pair.
 */
async function chooseCards(page: Page): Promise<{ control: CardSnapshot; keyword: string; target: CardSnapshot }> {
	const cards = await waitForCards(page);
	const [target] = cards;
	const { title: keyword } = target;
	const control = cards.find((card) => !normalizeForMatch(card.title).includes(normalizeForMatch(keyword)));
	test.skip(!control, "every titled card on this page carries the chosen keyword, so nothing can serve as the control");
	return { control: control!, keyword, target };
}
async function expectCardMasked(page: Page, id: string, original: CardSnapshot): Promise<void> {
	await expect.poll(async () => (await readCard(page, id))?.blocked, { timeout: 10_000 }).toBe(true);
	const masked = (await readCard(page, id))!;
	expect(masked.title).toBe(MASKED_TITLE);
	// Every image that had a source shows the placeholder, without a srcset that could bring the real picture back;
	// the ones YouTube had not loaded yet are left for later.
	if (hasImageWithSource(original)) expect(masked.images.some(({ src }) => isBlockedPlaceholderUrl(src))).toBe(true);
	expect(masked.images.filter(({ src }) => src !== null && src.length > 0 && !isBlockedPlaceholderUrl(src))).toEqual([]);
	expect(masked.images.filter(({ src, srcset }) => isBlockedPlaceholderUrl(src) && srcset !== null)).toEqual([]);
	if (original.hostAttributes > 0) expect(masked.hostAttributes).toBe(0);
}
async function expectCardRestored(page: Page, id: string, original: CardSnapshot): Promise<void> {
	await expect.poll(async () => (await readCard(page, id))?.blocked, { timeout: 10_000 }).toBe(false);
	const restored = (await readCard(page, id))!;
	expect(restored.title).toBe(original.title);
	expect(restored.images.filter(({ src }) => isBlockedPlaceholderUrl(src))).toEqual([]);
	expect(restored.hostAttributes).toBe(original.hostAttributes);
}
/** Waits for the injected markup to read as given: masked or not, and the text of every listed target. */
async function expectInjected(
	page: Page,
	id: string,
	selectors: string[],
	expected: { blocked: boolean; texts: string[] }
): Promise<InjectedSnapshot> {
	await expect
		.poll(
			async () => {
				const snapshot = await readInjected(page, id, selectors);
				return { blocked: snapshot.blocked, texts: snapshot.texts };
			},
			{ timeout: 10_000 }
		)
		.toEqual(expected);
	return readInjected(page, id, selectors);
}
/** Passes when no card still shows the keyword in the open and at least one card is masked. */
async function expectKeywordMaskedEverywhere(page: Page, keyword: string): Promise<void> {
	await expect
		.poll(
			async () => {
				const cards = await readCards(page);
				const exposed = cards.filter((card) => !card.blocked && normalizeForMatch(card.title).includes(normalizeForMatch(keyword)));
				return { exposed: exposed.length, masked: cards.filter((card) => card.blocked).length };
			},
			{ timeout: 15_000 }
		)
		.toEqual({ exposed: 0, masked: expect.any(Number) });
	expect((await readCards(page)).some((card) => card.blocked)).toBe(true);
}
function hasImageWithSource(card: CardSnapshot): boolean {
	return card.images.some(({ src }) => src !== null && src.length > 0);
}
/**
 * Adds a container of the given tag to the page and fills it afterwards. YouTube's custom elements stamp their
 * own template the moment they are connected and drop whatever was parsed into them before, so the markup only
 * goes in once the element is upgraded. `fill` runs in the page with the new element.
 */
async function injectMarkup(page: Page, options: { className?: string; html: string; id: string; tag: string }): Promise<void> {
	await page.evaluate(({ className, html, id, tag }) => {
		const element = document.createElement(tag);
		element.id = id;
		if (className) element.className = className;
		document.body.appendChild(element);
		element.innerHTML = html;
	}, options);
}
/**
 * End-screen video-wall stills are plain elements, so a synthetic one can be added without YouTube's custom
 * elements re-stamping it. It carries everything the feature masks or must leave alone: a title made of several
 * text nodes, a thumbnail with a srcset, a background image and a mini-game card image, which is excluded.
 */
async function injectVideoWallCard(page: Page): Promise<void> {
	await injectMarkup(page, {
		className: "ytp-videowall-still",
		html:
			`<div class="ytp-videowall-still-image" style="background-image: url(&quot;${INJECTED_THUMBNAIL}&quot;); width: 160px; height: 90px;"></div>` +
			`<img id="${INJECTED_CARD_ID}-thumbnail" src="${INJECTED_THUMBNAIL}" srcset="${INJECTED_THUMBNAIL} 1x, ${INJECTED_THUMBNAIL_LATE} 2x" alt="" width="160" height="90">` +
			`<img class="ytMiniGameCardViewModelThumbnailImage" src="${INJECTED_AVATAR}" alt="" width="40" height="40">` +
			`<span class="ytp-videowall-still-info-title">${INJECTED_TITLE_HTML}</span>`,
		id: INJECTED_CARD_ID,
		tag: "div"
	});
}
async function readCard(page: Page, id: string): Promise<CardSnapshot | undefined> {
	return (await readCards(page)).find((card) => card.id === id);
}
/**
 * Reads every outermost video card that carries a title element, tagging each with a stable id on first sight.
 * Titles are whitespace-normalised the way the feature normalises them before matching.
 */
async function readCards(page: Page): Promise<CardSnapshot[]> {
	return page.evaluate(
		({ blockedAttribute, cardIdAttribute, cardSelector, titleSelector }) => {
			const cards = Array.from(document.querySelectorAll<HTMLElement>(cardSelector)).filter(
				(card) => card.parentElement?.closest(cardSelector) === null
			);
			let { length: nextId } = document.querySelectorAll(`[${cardIdAttribute}]`);
			const snapshots: CardSnapshot[] = [];
			for (const card of cards) {
				const titleElement = card.querySelector<HTMLElement>(titleSelector);
				if (!titleElement) continue;
				if (!card.hasAttribute(cardIdAttribute)) card.setAttribute(cardIdAttribute, String(nextId++));
				const hosts = new Set<Element>([titleElement]);
				const anchor = titleElement.closest("a");
				if (anchor) hosts.add(anchor);
				const heading = titleElement.closest("h1, h2, h3, h4");
				if (heading) hosts.add(heading);
				let hostAttributes = 0;
				for (const host of hosts) {
					if (host.hasAttribute("title")) hostAttributes++;
					if (host.hasAttribute("aria-label")) hostAttributes++;
				}
				snapshots.push({
					blocked: card.hasAttribute(blockedAttribute),
					hostAttributes,
					id: card.getAttribute(cardIdAttribute) ?? "",
					images: Array.from(card.querySelectorAll("img")).map((image) => ({ src: image.getAttribute("src"), srcset: image.getAttribute("srcset") })),
					title: (titleElement.textContent ?? "").replace(/\s+/g, " ").trim()
				});
			}
			return snapshots;
		},
		{ blockedAttribute: BLOCKED_ATTRIBUTE, cardIdAttribute: CARD_ID_ATTRIBUTE, cardSelector: CARD_SELECTOR, titleSelector: TITLE_SELECTOR }
	);
}
/** Reads injected markup: its blocked mark, the whitespace-normalised text of each selector and its images. */
async function readInjected(page: Page, id: string, selectors: string[]): Promise<InjectedSnapshot> {
	return page.evaluate(
		({ blockedAttribute, id, selectors }) => {
			const container = document.getElementById(id);
			if (!container) return { blocked: false, images: [], texts: selectors.map(() => "<missing>") };
			return {
				blocked: container.hasAttribute(blockedAttribute),
				images: Array.from(container.querySelectorAll("img")).map((image) => ({
					src: image.getAttribute("src"),
					srcset: image.getAttribute("srcset")
				})),
				// Text nodes are walked the way the feature walks them, past YouTube's patched DOM accessors.
				texts: selectors.map((selector) => {
					const element = container.querySelector(selector);
					if (!element) return "<missing>";
					const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
					let text = "";
					for (let node = walker.nextNode(); node; node = walker.nextNode()) text += node.textContent ?? "";
					return text.replace(/\s+/g, " ").trim();
				})
			};
		},
		{ blockedAttribute: BLOCKED_ATTRIBUTE, id, selectors }
	);
}
async function readInjectedCard(page: Page) {
	return page.evaluate(
		({ blockedAttribute, id }) => {
			const card = document.getElementById(id);
			if (!card) return null;
			const still = card.querySelector<HTMLElement>(".ytp-videowall-still-image");
			const thumbnail = document.getElementById(`${id}-thumbnail`);
			const title = card.querySelector(".ytp-videowall-still-info-title");
			return {
				backgroundImage: still?.style.backgroundImage ?? "",
				blocked: card.hasAttribute(blockedAttribute),
				excludedImageSource: card.querySelector("img.ytMiniGameCardViewModelThumbnailImage")?.getAttribute("src") ?? null,
				imageSource: thumbnail?.getAttribute("src") ?? null,
				imageSrcset: thumbnail?.getAttribute("srcset") ?? null,
				title: (title?.textContent ?? "").trim(),
				titleHtml: title?.innerHTML ?? ""
			};
		},
		{ blockedAttribute: BLOCKED_ATTRIBUTE, id: INJECTED_CARD_ID }
	);
}
/** Rewrites a card's title in place the way YouTube does when it reuses a node for another video. */
async function rewriteTitle(page: Page, id: string, text: string): Promise<void> {
	await page.evaluate(
		({ cardIdAttribute, id, text, titleSelector }) => {
			const titleElement = document.querySelector(`[${cardIdAttribute}="${id}"]`)?.querySelector(titleSelector);
			if (!titleElement) throw new Error(`no title element on card ${id}`);
			const walker = document.createTreeWalker(titleElement, NodeFilter.SHOW_TEXT);
			let written = false;
			for (let node = walker.nextNode(); node; node = walker.nextNode()) {
				if (!(node instanceof Text) || node.data.trim().length === 0) continue;
				node.data = written ? "" : text;
				written = true;
			}
			if (!written) throw new Error(`no text node on card ${id}`);
		},
		{ cardIdAttribute: CARD_ID_ATTRIBUTE, id, text, titleSelector: TITLE_SELECTOR }
	);
}
/** Waits until the page shows at least `min` titled cards, which the related list on watch takes a moment to render. */
async function waitForCards(page: Page, min = 2): Promise<CardSnapshot[]> {
	await expect
		.poll(async () => (await readCards(page)).filter((card) => card.title.length > 0).length, { timeout: 20_000 })
		.toBeGreaterThanOrEqual(min);
	return (await readCards(page)).filter((card) => card.title.length > 0);
}

test.describe("keywordBlocklist", () => {
	for (const pageType of maskingPages) {
		test(`masks the title and thumbnail of a video whose title carries a blocked keyword on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			const { control, keyword, target } = await chooseCards(page);
			// Upper case with doubled spaces: the feature lower-cases and collapses whitespace on both sides before matching.
			await setFeatureValue(page, "keywordBlocklist.keywords", `  ${keyword.toUpperCase().replace(/ /g, "  ")}  `);
			await enableFeature(page, "keywordBlocklist.enabled");
			await expectCardMasked(page, target.id, target);
			// A card whose title does not carry the keyword keeps its title, images and attributes.
			await expectCardRestored(page, control.id, control);
		});
	}

	test(`masks a playlist panel entry on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		const entry = page.locator(`${PLAYLIST_PANEL_ITEM_SELECTOR} #video-title`).first();
		await expect(entry).toBeAttached({ timeout: 15_000 });
		const title = ((await entry.textContent()) ?? "").replace(/\s+/g, " ").trim();
		expect(title.length).toBeGreaterThan(0);
		await setFeatureValue(page, "keywordBlocklist.keywords", title);
		await enableFeature(page, "keywordBlocklist.enabled");
		await expect(page.locator(PLAYLIST_PANEL_ITEM_SELECTOR).first()).toHaveAttribute(BLOCKED_ATTRIBUTE, "", { timeout: 10_000 });
		await expect(entry).toHaveText(MASKED_TITLE);
	});

	test(`leaves the page alone while disabled, whatever the keyword list says, on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		const { keyword, target } = await chooseCards(page);
		// The registry hands config changes to disabled features too. Acting on one here would mask cards on a page
		// the feature is off for, with a label onEnable has not resolved yet, and the original title would be lost.
		await setFeatureValue(page, "keywordBlocklist.keywords", keyword);
		await expectToStay(() => page.locator(`[${BLOCKED_ATTRIBUTE}]`).count(), 0, { durationMs: 2000, page });
		await expectCardRestored(page, target.id, target);
		await enableFeature(page, "keywordBlocklist.enabled");
		await expectCardMasked(page, target.id, target);
	});

	test(`follows the keyword list while enabled on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		const { control, keyword, target } = await chooseCards(page);
		await enableFeature(page, "keywordBlocklist.enabled");
		// Enabled with an empty list nothing is touched.
		await expectCardRestored(page, target.id, target);
		await setFeatureValue(page, "keywordBlocklist.keywords", keyword);
		await expectCardMasked(page, target.id, target);
		// Swapping the list for the control's title moves the mask from one card to the other.
		await setFeatureValue(page, "keywordBlocklist.keywords", control.title);
		await expectCardRestored(page, target.id, target);
		await expectCardMasked(page, control.id, control);
		// The list is one keyword per line.
		await setFeatureValue(page, "keywordBlocklist.keywords", `${keyword}\n${control.title}`);
		await expectCardMasked(page, target.id, target);
		await expectCardMasked(page, control.id, control);
		// A keyword matches anywhere inside a title: the tail of the target's title is enough.
		await setFeatureValue(page, "keywordBlocklist.keywords", keyword.split(" ").slice(-2).join(" "));
		await expectCardMasked(page, target.id, target);
		// Blank and whitespace-only lines are no keywords: the list counts as empty, everything is restored and the
		// feature stops watching the page.
		await setFeatureValue(page, "keywordBlocklist.keywords", "\n   \n");
		await expectCardRestored(page, target.id, target);
		await expectCardRestored(page, control.id, control);
		expect(await page.locator(`[${BLOCKED_ATTRIBUTE}]`).count()).toBe(0);
	});

	test(`restores titles, thumbnails and attributes on disable on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		const { keyword, target } = await chooseCards(page);
		await setFeatureValue(page, "keywordBlocklist.keywords", keyword);
		await enableFeature(page, "keywordBlocklist.enabled");
		await expectCardMasked(page, target.id, target);
		await disableFeature(page, "keywordBlocklist.enabled");
		await expectCardRestored(page, target.id, target);
		expect(await page.locator(`[${BLOCKED_ATTRIBUTE}]`).count()).toBe(0);
		await enableFeature(page, "keywordBlocklist.enabled");
		await expectCardMasked(page, target.id, target);
	});

	test(`follows title rewrites the page makes to a card on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		const { control, keyword, target } = await chooseCards(page);
		await setFeatureValue(page, "keywordBlocklist.keywords", keyword);
		await enableFeature(page, "keywordBlocklist.enabled");
		await expectCardMasked(page, target.id, target);
		// YouTube reuses card nodes for other videos. A masked card whose title is rewritten to something harmless is
		// let go: the mark and the placeholders leave, and the new title stands.
		await rewriteTitle(page, target.id, "a harmless rewrite");
		await expectCardRestored(page, target.id, { ...target, title: "a harmless rewrite" });
		// And a clean card whose title comes to carry the keyword is masked without any nudge from the config.
		await rewriteTitle(page, control.id, `${keyword} again`);
		await expectCardMasked(page, control.id, control);
	});

	test(`masks a card rendered after enabling, re-masks a late thumbnail and gives everything back on disable on ${channel_videos}`, async ({
		page
	}) => {
		await navigateToPageType(page, channel_videos);
		await setFeatureValue(page, "keywordBlocklist.keywords", "blocklist probe");
		await enableFeature(page, "keywordBlocklist.enabled");
		await injectVideoWallCard(page);
		const original = (await readInjectedCard(page))!;
		expect(original.title).toBe(INJECTED_TITLE);
		// The observer picks the new card up on its own; no navigation or config change nudges the feature.
		await expect.poll(async () => (await readInjectedCard(page))?.blocked, { timeout: 10_000 }).toBe(true);
		const masked = (await readInjectedCard(page))!;
		expect(masked.title).toBe(MASKED_TITLE);
		expect(isBlockedPlaceholderUrl(masked.imageSource)).toBe(true);
		expect(masked.imageSrcset).toBeNull();
		expect(isBlockedPlaceholderUrl(masked.backgroundImage)).toBe(true);
		// The mini-game card image is excluded from masking.
		expect(masked.excludedImageSource).toBe(INJECTED_AVATAR);
		// YouTube sets a thumbnail's real source late, after the mask: the feature masks it again and remembers the
		// new source as the one to give back.
		await page.evaluate(({ id, source }) => document.getElementById(`${id}-thumbnail`)?.setAttribute("src", source), {
			id: INJECTED_CARD_ID,
			source: INJECTED_THUMBNAIL_LATE
		});
		await expect.poll(async () => isBlockedPlaceholderUrl((await readInjectedCard(page))?.imageSource), { timeout: 10_000 }).toBe(true);
		await disableFeature(page, "keywordBlocklist.enabled");
		await expect.poll(async () => (await readInjectedCard(page))?.blocked, { timeout: 10_000 }).toBe(false);
		// Node by node: the bold span inside the title is back where it was.
		expect(await readInjectedCard(page)).toEqual({ ...original, blocked: false, imageSource: INJECTED_THUMBNAIL_LATE });
	});

	test(`masks a channel result's name, tooltip, handle and description but not its subscriber count on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		await setFeatureValue(page, "keywordBlocklist.keywords", INJECTED_KEYWORD);
		await enableFeature(page, "keywordBlocklist.enabled");
		const id = "yte-test-channel-result";
		await injectMarkup(page, {
			html:
				`<div id="avatar"><img src="${INJECTED_AVATAR}" alt="" width="88" height="88"></div>` +
				`<div id="channel-title"><span id="text">Probe Channel</span><div id="tooltip">Probe Channel</div></div>` +
				`<span id="subscribers">@probechannel</span><span id="video-count">1.2M subscribers</span>` +
				`<div id="description">The probe channel's description</div>`,
			id,
			tag: "ytd-channel-renderer"
		});
		const selectors = ["#channel-title #text", "#channel-title #tooltip", "#subscribers", "#video-count", "#description"];
		const masked = await expectInjected(page, id, selectors, {
			blocked: true,
			texts: [MASKED_TITLE, MASKED_TITLE, MASKED_TITLE, "1.2M subscribers", MASKED_TITLE]
		});
		// The avatar gets the square placeholder rather than the thumbnail one.
		expect(masked.images).toEqual([{ src: BLOCKED_AVATAR_URL, srcset: null }]);
		await disableFeature(page, "keywordBlocklist.enabled");
		const restored = await expectInjected(page, id, selectors, {
			blocked: false,
			texts: ["Probe Channel", "Probe Channel", "@probechannel", "1.2M subscribers", "The probe channel's description"]
		});
		expect(restored.images).toEqual([{ src: INJECTED_AVATAR, srcset: null }]);
	});

	test(`masks a sponsored lockup's headline and thumbnail but not its advertiser line on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		await setFeatureValue(page, "keywordBlocklist.keywords", INJECTED_KEYWORD);
		await enableFeature(page, "keywordBlocklist.enabled");
		const id = "yte-test-sponsored-lockup";
		// An end-screen element class makes the container; the ad metadata component inside is what the selectors target.
		await injectMarkup(page, {
			className: "ytp-ce-element",
			html:
				`<img src="${INJECTED_THUMBNAIL}" alt="" width="160" height="90">` +
				`<feed-ad-metadata-view-model>` +
				`<span class="ytAttributedStringHost" id="${id}-headline">Probe headline</span>` +
				`<span class="ytAttributedStringHost" id="${id}-description">A plain description</span>` +
				`<ad-details-line-view-model><span class="ytAttributedStringHost" id="${id}-advertiser">Probe Advertiser</span></ad-details-line-view-model>` +
				`</feed-ad-metadata-view-model>`,
			id,
			tag: "div"
		});
		const selectors = [`#${id}-headline`, `#${id}-description`, `#${id}-advertiser`];
		// Each text block is matched on its own: the description without the keyword and the advertiser line, which
		// the selector excludes, keep their text.
		const masked = await expectInjected(page, id, selectors, { blocked: true, texts: [MASKED_TITLE, "A plain description", "Probe Advertiser"] });
		expect(masked.images.map(({ src }) => isBlockedPlaceholderUrl(src))).toEqual([true]);
		await disableFeature(page, "keywordBlocklist.enabled");
		const restored = await expectInjected(page, id, selectors, {
			blocked: false,
			texts: ["Probe headline", "A plain description", "Probe Advertiser"]
		});
		expect(restored.images).toEqual([{ src: INJECTED_THUMBNAIL, srcset: null }]);
	});

	test(`masks a shorts lockup's title and strips the link's title attribute on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		await setFeatureValue(page, "keywordBlocklist.keywords", INJECTED_KEYWORD);
		await enableFeature(page, "keywordBlocklist.enabled");
		const shortsId = "yte-test-shorts-lockup";
		await injectMarkup(page, {
			html:
				`<img src="${INJECTED_THUMBNAIL}" alt="" width="90" height="160">` +
				`<h3><a class="shortsLockupViewModelHostOutsideMetadataEndpoint" href="/shorts/Ay8lynMZ4mE" title="A probe short">A probe short</a></h3>`,
			id: shortsId,
			tag: "ytm-shorts-lockup-view-model-v2"
		});
		const selectors = [".shortsLockupViewModelHostOutsideMetadataEndpoint"];
		const masked = await expectInjected(page, shortsId, selectors, { blocked: true, texts: [MASKED_TITLE] });
		expect(masked.images.map(({ src }) => isBlockedPlaceholderUrl(src))).toEqual([true]);
		await expect(page.locator(`#${shortsId} a`)).not.toHaveAttribute("title");
		await disableFeature(page, "keywordBlocklist.enabled");
		const restored = await expectInjected(page, shortsId, selectors, { blocked: false, texts: ["A probe short"] });
		expect(restored.images).toEqual([{ src: INJECTED_THUMBNAIL, srcset: null }]);
		await expect(page.locator(`#${shortsId} a`)).toHaveAttribute("title", "A probe short");
	});

	test(`keeps masking across in-page navigation to home and back on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		const { keyword, target } = await chooseCards(page);
		await setFeatureValue(page, "keywordBlocklist.keywords", keyword);
		await enableFeature(page, "keywordBlocklist.enabled");
		await expectCardMasked(page, target.id, target);
		// Real SPA hops: the channel grid is rebuilt on the way back and has to be masked again from onNavigate.
		await spaNavigateToHome(page);
		await spaNavigateBack(page, channel_videos);
		await expectKeywordMaskedEverywhere(page, keyword);
	});

	test(`masks again after a full page reload on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		const { keyword, target } = await chooseCards(page);
		await setFeatureValue(page, "keywordBlocklist.keywords", keyword);
		await enableFeature(page, "keywordBlocklist.enabled");
		await expectCardMasked(page, target.id, target);
		await reloadPage(page, channel_videos);
		await expectKeywordMaskedEverywhere(page, keyword);
	});

	test(`holds back the hover preview of a masked card on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		const { keyword, target } = await chooseCards(page);
		await setFeatureValue(page, "keywordBlocklist.keywords", keyword);
		await enableFeature(page, "keywordBlocklist.enabled");
		await expectCardMasked(page, target.id, target);
		// The body class is what index.css keys the preview suppression on; it follows the pointer in and out of a masked card.
		await page.locator(`[${CARD_ID_ATTRIBUTE}="${target.id}"]`).hover();
		await expect(page.locator("body")).toHaveClass(new RegExp(`\\b${HOVER_BLOCKED_CLASS}\\b`));
		// The mouseover never reaches YouTube's own handlers, so no inline preview starts while the pointer rests there.
		await page.waitForTimeout(1500);
		await expect(page.locator("ytd-video-preview")).toBeHidden();
		await page.locator("ytd-masthead").hover();
		await expect(page.locator("body")).not.toHaveClass(new RegExp(`\\b${HOVER_BLOCKED_CLASS}\\b`));
	});

	test(`still opens a masked card's video on click on ${channel_videos}`, async ({ page }) => {
		await navigateToPageType(page, channel_videos);
		const { keyword, target } = await chooseCards(page);
		await setFeatureValue(page, "keywordBlocklist.keywords", keyword);
		await enableFeature(page, "keywordBlocklist.enabled");
		await expectCardMasked(page, target.id, target);
		// Only text and images are touched; the links keep their targets.
		await page.locator(`[${CARD_ID_ATTRIBUTE}="${target.id}"] a[href*="watch?v="]`).first().click();
		await page.waitForURL(/\/watch\?v=/, { timeout: 30_000 });
	});
});
