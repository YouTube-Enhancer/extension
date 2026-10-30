import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";

/** Matches the redirect-wrapped links the feature replaces with the URL they actually point at. */
export const REDIRECT_LINK_SELECTOR = 'a[href*="/redirect?"]';
const REDIRECT_PREFIX = "https://www.youtube.com/redirect?";
/** Owner name for the per-frame `load` listeners, so disable can drop them all in one call. */
const FEATURE_NAME = "removeRedirect";
/**
 * Per-frame `load` closures. The event manager de-duplicates callbacks per feature, not per target, so a
 * single shared handler would silently attach only to the first frame it is registered on; a unique
 * closure per frame keeps every tracked frame's listener live.
 */
const frameLoadHandlers = new Map<HTMLIFrameElement, () => void>();
/**
 * Per-frame mutation-bus subscriptions, each scoped to its frame's own document. The shared observer
 * watches the top document's `document.body` and cannot see across a frame boundary, so a frame document
 * is only observable through the bus's `parent` option, which gives that subscriber its own root observer
 * inside the frame. The live chat iframe also navigates after its first load (the chat app's hop to its
 * real document), which strands a subscription on the dead document; the frame `load` handler re-arms it
 * on the new one.
 */
const frameSubscriptions = new Map<
	HTMLIFrameElement,
	{ document: Document; unsubscribe: UnsubscribeFromDomMutations }
>();
let unsubscribeFramesBus: Nullable<UnsubscribeFromDomMutations> = null;

/**
 * Unwraps the redirect links already inside every frame on the page, then arms one subscription per frame
 * document so links that arrive later (a live chat message containing a URL) are unwrapped as they land.
 * Frames need this because the embedded script never runs in them (it bails when `window.self !== window.top`),
 * so no other part of the extension can reach the chat document from the top-level script.
 */
export function attachFrameUnwrapping(): void {
	scanFrames();
	if (unsubscribeFramesBus) return;
	// Frames nest inside whatever YouTube inserts (the chat iframe sits inside ytd-live-chat-frame), so the
	// subtree scan is what finds them. Iframes are rare compared to links, so unlike a broad `[href]`
	// subscription the delivery volume here stays low even with the deep scan enabled.
	unsubscribeFramesBus = subscribeToDomMutations("iframe", handleFramesAdded, { deep: true });
}

/** Stops watching for frames and drops every per-frame subscription and load listener. */
export function detachFrameUnwrapping(): void {
	unsubscribeFramesBus?.();
	unsubscribeFramesBus = null;
	for (const { unsubscribe } of frameSubscriptions.values()) unsubscribe();
	frameSubscriptions.clear();
	frameLoadHandlers.clear();
	eventManager.removeEventListeners(FEATURE_NAME);
}

/** Mutation-bus callback: unwrap each delivered match. */
export function unwrapRedirectElements(elements: Element[]): void {
	for (const el of elements) unwrapRedirect(el);
}

/** Unwrap every redirect link already present under `root`, which may be a document or an element. */
export function unwrapRedirectsIn(root: ParentNode): void {
	root.querySelectorAll(REDIRECT_LINK_SELECTOR).forEach(unwrapRedirect);
}

function attachFrame(frame: HTMLIFrameElement): void {
	if (!frameLoadHandlers.has(frame)) {
		const handler = () => {
			// The frame's document may be new (the first real load after about:blank, or a navigation):
			// unwrap what is already in it and move the subscription over from the document it replaces.
			processFrameDocument(frame);
		};
		frameLoadHandlers.set(frame, handler);
		eventManager.addEventListener(frame, "load", handler, FEATURE_NAME);
	}
	processFrameDocument(frame);
}

function dropFrameSubscription(frame: HTMLIFrameElement): void {
	const existing = frameSubscriptions.get(frame);
	if (!existing) return;
	existing.unsubscribe();
	frameSubscriptions.delete(frame);
}

function ensureFrameSubscription(frame: HTMLIFrameElement, frameDocument: Document): void {
	const { documentElement: root } = frameDocument;
	if (!root) return;
	const existing = frameSubscriptions.get(frame);
	if (existing?.document === frameDocument) return;
	existing?.unsubscribe();
	const unsubscribe = subscribeToDomMutations(REDIRECT_LINK_SELECTOR, unwrapRedirectElements, {
		deep: true,
		parent: root
	});
	frameSubscriptions.set(frame, { document: frameDocument, unsubscribe });
}

function getFrameDocument(frame: HTMLIFrameElement): Nullable<Document> {
	try {
		// Same-origin frames (the live chat iframe) expose their document; cross-origin ones read as null.
		return frame.contentDocument;
	} catch {
		return null;
	}
}

function handleFramesAdded(elements: Element[]): void {
	pruneFrames();
	for (const element of elements) {
		if (element instanceof HTMLIFrameElement) attachFrame(element);
	}
}

function processFrameDocument(frame: HTMLIFrameElement): void {
	const frameDocument = getFrameDocument(frame);
	if (!frameDocument) {
		// The frame now sits behind an origin we cannot read (an ad slot). Release what is held on the
		// document it navigated away from instead of pinning a dead one until the feature is disabled.
		dropFrameSubscription(frame);
		return;
	}
	unwrapRedirectsIn(frameDocument);
	ensureFrameSubscription(frame, frameDocument);
}

/**
 * Drops subscriptions and load listeners for frames that have left the document. Without this, a long
 * session of SPA navigations would pin every replaced chat document in memory until the feature is disabled.
 */
function pruneFrames(): void {
	for (const frame of frameLoadHandlers.keys()) {
		if (frame.isConnected) continue;
		eventManager.removeEventListener(frame, "load", FEATURE_NAME);
		frameLoadHandlers.delete(frame);
		dropFrameSubscription(frame);
	}
}

function scanFrames(): void {
	pruneFrames();
	for (const frame of document.querySelectorAll("iframe")) attachFrame(frame);
}

function unwrapRedirect(el: Element): void {
	const href: Nullable<string> = el.getAttribute("href");
	if (!href || !href.startsWith(REDIRECT_PREFIX)) return;
	try {
		const url = new URL(href);
		const target = url.searchParams.get("q");
		if (target) el.setAttribute("href", target);
	} catch {
		/* ignore malformed urls */
	}
}
