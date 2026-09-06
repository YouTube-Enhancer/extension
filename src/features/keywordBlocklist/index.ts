import "./index.css";

import type { configuration, Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { parseLineList } from "@/src/utils/string";

import { BLOCKED_AVATAR_URL, BLOCKED_THUMBNAIL_URL, isBlockedPlaceholderUrl } from "./blockedPlaceholder";
import { metadata } from "./index.metadata";
import { createKeywordMatcher, normalizeWhitespace } from "./utils";

type AttributeStash = { ariaLabel: Nullable<string>; title: Nullable<string> };
type ImageStash = { src: Nullable<string>; srcset: Nullable<string> };
type KeywordBlocklistConfiguration = configuration["keywordBlocklist"];
type TitleStash = { nodes: [Text, string][]; original: string };

const BLOCKED_ATTRIBUTE = "data-yte-keyword-blocked";
const HOVER_BLOCKED_CLASS = "yte-hover-blocked";
const VIDEO_CONTAINER_SELECTOR =
	"ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-channel-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model-v2, .ytp-ce-element, .ytp-videowall-still, ytd-playlist-panel-video-renderer, ytd-notification-renderer";
// Every piece of text inside a container that is checked against the blocklist and masked when it matches.
const TEXT_TARGET_SELECTOR = [
	"#video-title",
	"a#video-title-link",
	".ytLockupMetadataViewModelTitle",
	".shortsLockupViewModelHostOutsideMetadataEndpoint",
	".ytp-ce-video-title",
	".ytp-videowall-still-info-title",
	"yt-formatted-string.message",
	// Sponsored lockups: every text block of the ad metadata component except the advertiser line,
	// anchored on the component's tag name rather than its layout-specific classes.
	"feed-ad-metadata-view-model .ytAttributedStringHost:not(ad-details-line-view-model *)",
	// Channel results: name, its hover tooltip, handle and description.
	"ytd-channel-renderer #channel-title #text",
	"ytd-channel-renderer #channel-title #tooltip",
	"ytd-channel-renderer #subscribers",
	"ytd-channel-renderer #description"
].join(", ");
const AVATAR_SELECTOR = "yt-decorated-avatar-view-model, yt-avatar-shape, ad-avatar-view-model, yt-avatar-stack-view-model, #avatar";
const AVATAR_IMAGE_CLASS = "ytSpecAvatarShapeImage";
const EXCLUDED_IMAGE_SELECTOR = "img.ytMiniGameCardViewModelThumbnailImage";
const HEADING_SELECTOR = "h1, h2, h3, h4";
const THUMBNAIL_BACKGROUND_SELECTOR = ".ytp-ce-element-thumb, .ytp-videowall-still-image";
const MASKED_BACKGROUND_IMAGE = `url("${BLOCKED_THUMBNAIL_URL}")`;
const SCAN_THROTTLE_MS = 150;
const FALLBACK_SCAN_INTERVAL_MS = 1500;

// Everything the feature changes on the page is remembered per element so it can be undone.
// Each mask recognises its own output, so when YouTube reuses a node for another video the
// stale entry is refreshed instead of being restored over the new content.
const attributeStashes = new WeakMap<Element, AttributeStash>();
const backgroundStashes = new WeakMap<HTMLElement, string>();
const imageStashes = new WeakMap<HTMLImageElement, ImageStash>();
const titleStashes = new WeakMap<HTMLElement, TitleStash>();

let matcher: (title: string) => boolean = () => false;
let hasKeywords = false;
let maskedTitleText = "";
let observer: Nullable<MutationObserver> = null;
let scanHandle: Nullable<number> = null;
let fallbackScanHandle: Nullable<number> = null;

export default createFeature({
	...metadata,
	onConfigChange: (config) => {
		/**
		 * The registry hands config changes to disabled features as well. A keyword edit made while the feature is
		 * off is picked up by the next enable; acting on it here would mask cards on a page the feature is off for,
		 * with a label onEnable has not resolved yet.
		 */
		if (!config.enabled) return;
		syncConfig(config);
		syncObserving();
	},
	onDisable: () => {
		stopObserving();
		restoreAll();
	},
	onEnable: (config) => {
		syncConfig(config);
		maskedTitleText =
			window.i18nextInstance.t((translations) => translations.pages.content.features.keywordBlocklist.messages.maskedTitle) || "Blocked keyword";
		syncObserving();
	},
	onNavigate: () => {
		if (observer) scheduleScan();
	}
});

function applyImages(container: HTMLElement) {
	for (const image of container.querySelectorAll<HTMLImageElement>("img")) {
		if (image.matches(EXCLUDED_IMAGE_SELECTOR)) continue;
		maskImage(image, isAvatarImage(image) ? BLOCKED_AVATAR_URL : BLOCKED_THUMBNAIL_URL);
	}
	for (const element of container.querySelectorAll<HTMLElement>(THUMBNAIL_BACKGROUND_SELECTOR)) {
		maskBackgroundImage(element);
	}
}

function collectTextNodes(element: HTMLElement): Text[] {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	const nodes: Text[] = [];
	let node = walker.nextNode();
	while (node) {
		if (node instanceof Text && node.data.trim().length > 0) nodes.push(node);
		node = walker.nextNode();
	}
	return nodes;
}

function getTextTargets(container: HTMLElement): HTMLElement[] {
	const candidates = Array.from(container.querySelectorAll<HTMLElement>(TEXT_TARGET_SELECTOR));
	// Nested matches share text nodes, so only the innermost element of each chain is masked.
	return candidates.filter((candidate) => !candidates.some((other) => other !== candidate && candidate.contains(other)));
}

function getTitleHosts(titleElement: HTMLElement): Element[] {
	const hosts = new Set<Element>();
	const anchor = titleElement.closest("a");
	if (anchor) hosts.add(anchor);
	const heading = titleElement.closest(HEADING_SELECTOR);
	if (heading) hosts.add(heading);
	hosts.add(titleElement);
	return Array.from(hosts);
}

function handleDocumentMouseOver(event: MouseEvent) {
	const target = event.target instanceof Element ? event.target : null;
	const blockedContainer = target?.closest(`[${BLOCKED_ATTRIBUTE}]`) ?? null;
	if (blockedContainer) {
		event.stopPropagation();
		document.body.classList.add(HOVER_BLOCKED_CLASS);
	} else {
		document.body.classList.remove(HOVER_BLOCKED_CLASS);
	}
}

function handleMutations(records: MutationRecord[]) {
	if (records.some(isRelevantMutation)) scheduleScan();
}

function isAvatarImage(image: HTMLImageElement): boolean {
	return image.classList.contains(AVATAR_IMAGE_CLASS) || image.closest(AVATAR_SELECTOR) !== null;
}

function isMaskedTitleText(text: string): boolean {
	return normalizeWhitespace(text) === normalizeWhitespace(maskedTitleText);
}

function isRelevantMutation(record: MutationRecord): boolean {
	const { addedNodes, target, type } = record;
	const targetElement = target instanceof Element ? target : target.parentElement;
	if (targetElement?.closest(VIDEO_CONTAINER_SELECTOR)) return true;
	if (type !== "childList") return false;
	for (const node of addedNodes) {
		if (node instanceof Element && (node.matches(VIDEO_CONTAINER_SELECTOR) || node.querySelector(VIDEO_CONTAINER_SELECTOR) !== null)) {
			return true;
		}
	}
	return false;
}

function maskBackgroundImage(element: HTMLElement) {
	const { style } = element;
	const { backgroundImage } = style;
	if (isBlockedPlaceholderUrl(backgroundImage)) return;
	backgroundStashes.set(element, backgroundImage);
	style.backgroundImage = MASKED_BACKGROUND_IMAGE;
}

function maskContainer(container: HTMLElement, targets: HTMLElement[], matched: Map<HTMLElement, string>) {
	container.setAttribute(BLOCKED_ATTRIBUTE, "");
	for (const target of targets) {
		const originalTitle = matched.get(target);
		if (originalTitle === undefined) {
			restoreTitle(target);
			restoreTitleAttributes(target);
		} else {
			maskTitle(target, originalTitle);
			maskTitleAttributes(target);
		}
	}
	applyImages(container);
}

function maskImage(image: HTMLImageElement, replacementUrl: string) {
	const src = image.getAttribute("src");
	const srcset = image.getAttribute("srcset");
	const stash = imageStashes.get(image);
	if (src === null && stash === undefined) return;
	const nextStash: ImageStash = stash ?? { src: null, srcset: null };
	if (src !== null && !isBlockedPlaceholderUrl(src)) nextStash.src = src;
	if (srcset !== null) nextStash.srcset = srcset;
	imageStashes.set(image, nextStash);
	if (srcset !== null) image.removeAttribute("srcset");
	if (src !== replacementUrl) image.setAttribute("src", replacementUrl);
}

function maskTitle(titleElement: HTMLElement, originalTitle: string) {
	if (titleStashes.has(titleElement)) return;
	const nodes = collectTextNodes(titleElement);
	if (nodes.length === 0) return;
	titleStashes.set(titleElement, { nodes: nodes.map((node) => [node, node.data]), original: originalTitle });
	nodes.forEach((node, index) => {
		node.data = index === 0 ? maskedTitleText : "";
	});
}

function maskTitleAttributes(titleElement: HTMLElement) {
	for (const host of getTitleHosts(titleElement)) {
		const title = host.getAttribute("title");
		const ariaLabel = host.getAttribute("aria-label");
		if (title === null && ariaLabel === null) continue;
		const stash = attributeStashes.get(host) ?? { ariaLabel: null, title: null };
		if (title !== null) {
			stash.title = title;
			host.removeAttribute("title");
		}
		if (ariaLabel !== null) {
			stash.ariaLabel = ariaLabel;
			host.removeAttribute("aria-label");
		}
		attributeStashes.set(host, stash);
	}
}

function processContainer(container: HTMLElement) {
	const targets = getTextTargets(container);
	const isMarked = container.hasAttribute(BLOCKED_ATTRIBUTE);
	if (targets.length === 0) {
		if (isMarked) restoreContainer(container);
		return;
	}
	const matched = new Map<HTMLElement, string>();
	let hasReadableText = false;
	for (const target of targets) {
		const originalTitle = resolveOriginalTitle(target);
		if (originalTitle === null) continue;
		hasReadableText = true;
		if (matcher(originalTitle)) matched.set(target, originalTitle);
	}
	if (matched.size > 0) {
		maskContainer(container, targets, matched);
	} else if (isMarked && hasReadableText) {
		// With no readable text yet the card is still rendering, so its current state is kept.
		restoreContainer(container);
	}
}

function resolveOriginalTitle(titleElement: HTMLElement): Nullable<string> {
	const currentTitle = titleElement.textContent ?? "";
	const stash = titleStashes.get(titleElement);
	if (stash) {
		if (isMaskedTitleText(currentTitle)) return stash.original;
		// The page rewrote the title, so the node now belongs to a different video.
		titleStashes.delete(titleElement);
	}
	return currentTitle.trim().length > 0 ? currentTitle : null;
}

function restoreAll() {
	for (const container of document.querySelectorAll<HTMLElement>(`[${BLOCKED_ATTRIBUTE}]`)) {
		restoreContainer(container);
	}
	document.body.classList.remove(HOVER_BLOCKED_CLASS);
}

function restoreBackgroundImage(element: HTMLElement) {
	const original = backgroundStashes.get(element);
	if (original === undefined) return;
	backgroundStashes.delete(element);
	const { style } = element;
	if (isBlockedPlaceholderUrl(style.backgroundImage)) style.backgroundImage = original;
}

function restoreContainer(container: HTMLElement) {
	container.removeAttribute(BLOCKED_ATTRIBUTE);
	for (const target of container.querySelectorAll<HTMLElement>(TEXT_TARGET_SELECTOR)) {
		restoreTitle(target);
		restoreTitleAttributes(target);
	}
	for (const image of container.querySelectorAll<HTMLImageElement>("img")) {
		restoreImage(image);
	}
	for (const element of container.querySelectorAll<HTMLElement>(THUMBNAIL_BACKGROUND_SELECTOR)) {
		restoreBackgroundImage(element);
	}
}

function restoreImage(image: HTMLImageElement) {
	const stash = imageStashes.get(image);
	if (!stash) return;
	imageStashes.delete(image);
	const { src, srcset } = stash;
	if (isBlockedPlaceholderUrl(image.getAttribute("src"))) {
		if (src === null) image.removeAttribute("src");
		else image.setAttribute("src", src);
	}
	if (srcset !== null && !image.hasAttribute("srcset")) image.setAttribute("srcset", srcset);
}

function restoreTitle(titleElement: HTMLElement) {
	const stash = titleStashes.get(titleElement);
	if (!stash) return;
	titleStashes.delete(titleElement);
	if (!isMaskedTitleText(titleElement.textContent ?? "")) return;
	for (const [node, data] of stash.nodes) {
		node.data = data;
	}
}

function restoreTitleAttributes(titleElement: HTMLElement) {
	for (const host of getTitleHosts(titleElement)) {
		const stash = attributeStashes.get(host);
		if (!stash) continue;
		attributeStashes.delete(host);
		const { ariaLabel, title } = stash;
		if (title !== null && !host.hasAttribute("title")) host.setAttribute("title", title);
		if (ariaLabel !== null && !host.hasAttribute("aria-label")) host.setAttribute("aria-label", ariaLabel);
	}
}

function scan() {
	if (!hasKeywords && document.querySelector(`[${BLOCKED_ATTRIBUTE}]`) === null) return;
	for (const container of document.querySelectorAll<HTMLElement>(VIDEO_CONTAINER_SELECTOR)) {
		processContainer(container);
	}
}

function scheduleScan() {
	// Throttle rather than debounce: a steady stream of mutations must not postpone the scan forever.
	if (scanHandle !== null) return;
	scanHandle = window.setTimeout(() => {
		scanHandle = null;
		scan();
	}, SCAN_THROTTLE_MS);
}

function startObserving() {
	if (observer) return;
	observer = new MutationObserver(handleMutations);
	observer.observe(document.body, {
		attributeFilter: ["src", "srcset", "style"],
		attributes: true,
		characterData: true,
		childList: true,
		subtree: true
	});
	document.addEventListener("mouseover", handleDocumentMouseOver, true);
	fallbackScanHandle = window.setInterval(scheduleScan, FALLBACK_SCAN_INTERVAL_MS);
}

function stopObserving() {
	observer?.disconnect();
	observer = null;
	document.removeEventListener("mouseover", handleDocumentMouseOver, true);
	document.body.classList.remove(HOVER_BLOCKED_CLASS);
	if (scanHandle !== null) {
		window.clearTimeout(scanHandle);
		scanHandle = null;
	}
	if (fallbackScanHandle !== null) {
		window.clearInterval(fallbackScanHandle);
		fallbackScanHandle = null;
	}
}

function syncConfig(config: KeywordBlocklistConfiguration) {
	const keywords = parseLineList(config.keywords);
	matcher = createKeywordMatcher(keywords);
	hasKeywords = keywords.length > 0;
}

function syncObserving() {
	if (hasKeywords) {
		startObserving();
		scheduleScan();
	} else {
		stopObserving();
		restoreAll();
	}
}
