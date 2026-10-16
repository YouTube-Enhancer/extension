import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";

/** Debounced so the top level observer does not run a document query for every YouTube DOM mutation. */
const ATTACH_DEBOUNCE_MS = 100;
const CHAT_FRAME_SELECTOR = "ytd-live-chat-frame iframe";
export const CHAT_STYLE_ID = "yte-hide-ai-chat";
/**
 * The chat side rules of `index.css` without the `ytd-live-chat-frame` prefix. The live chat DOM lives inside the
 * same origin `#chatframe` iframe where the embedded script never runs (it bails when `window.self !== window.top`),
 * so the prefixed rules in the top document can never match it. Scoped to the frame's own document these do.
 */
const CHAT_STYLE_TEXT = `yt-live-chat-banner-renderer,
[class*="ai-summary"],
[class*="generative"],
ytd-engagement-panel-section-list-renderer[target-id="PAyouchat"] {
	display: none !important;
}`;
const FEATURE_NAME = "hideArtificialIntelligence";
/**
 * Matches the frame document's structural children. The chat app replaces its `head` wholesale after the post-load
 * navigation to `youtube.com/live_chat`, and that replacement is the mutation that wipes the injected style; a
 * replacement always adds the new `head` back, which this selector catches. Narrowed from `*` so the busy chat DOM
 * (streaming messages, gift animations) cannot wake the style re-check on every added node. A pure removal at html
 * level with no `head` or `body` added back is the one trigger the mutation bus's added-node delivery cannot
 * express, and the chat app never performs one - cross-document navigations still fire the frame `load` handler.
 */
const FRAME_STYLE_TRIGGER_SELECTOR = "head, body";

let attachTimeout: Nullable<ReturnType<typeof setTimeout>> = null;
let unsubscribeBus: Nullable<UnsubscribeFromDomMutations> = null;
let cleanupRegistered = false;
/**
 * Per-frame mutation-bus subscriptions on the chat frame's own document. The frame navigates to its real
 * `youtube.com/live_chat` document after its first `load`, and that navigation wipes the injected style element.
 * Neither the top-document mutation bus nor the frame `load` event fires again for it, so the style stayed gone
 * until the next full enable. The subscription is parent-scoped to the frame document's `documentElement`, which
 * the bus observes through its detached-root mechanism because the shared observer on `document.body` cannot see
 * across the frame boundary, so the rebuilt `head` re-injects as soon as the chat app stamps it. A cross-document
 * navigation strands the subscription on the dead document; the frame `load` handler re-arms it on the new one.
 */
const frameSubscriptions = new Map<
	HTMLIFrameElement,
	{ document: Document; unsubscribe: UnsubscribeFromDomMutations }
>();

/**
 * Injects the chat side hide rules into every live chat frame that is currently present and keeps injecting them
 * into frames that appear or reload later.
 */
export function applyChatFrameHide(): void {
	attachToChatFrames();
	startChatFrameObserver();
	registerCleanup();
}

/** Removes the injected style from every live chat frame and stops watching for new ones. */
export function removeChatFrameHide(): void {
	stopChatFrameObserver();
	removeInjectedStyles();
	eventManager.removeEventListeners(FEATURE_NAME);
}

function attachToChatFrames(): void {
	for (const frame of getChatFrames()) {
		// The event manager de-duplicates by callback reference, so re-attaching the same handler is a no-op.
		eventManager.addEventListener(frame, "load", handleChatFrameLoad, FEATURE_NAME);
		injectStyleIntoFrame(frame);
	}
}

/** Drop the per-frame bus subscriptions, including for frames that have since left the document. */
function disconnectFrameSubscriptions(): void {
	for (const { unsubscribe } of frameSubscriptions.values()) unsubscribe();
	frameSubscriptions.clear();
}

/**
 * Watch the frame's document so the hide rules survive the chat app rebuilding its DOM (the post-load navigation
 * to `youtube.com/live_chat` replaces `head` wholesale and drops the style with it). Re-injecting is idempotent,
 * so the subscription re-checks the document on every delivery. Arms once per document: a second call for the
 * same document is a no-op, while a new document (the frame navigated) first tears down the stranded subscription.
 */
function ensureFrameSubscription(frame: HTMLIFrameElement, frameDocument: Document): void {
	const { documentElement: root } = frameDocument;
	if (!root) return;
	const existing = frameSubscriptions.get(frame);
	if (existing?.document === frameDocument) return;
	existing?.unsubscribe();
	const unsubscribe = subscribeToDomMutations(
		FRAME_STYLE_TRIGGER_SELECTOR,
		() => {
			// The style can be wiped between the triggering mutation and this delivery; re-check instead of
			// trusting that the mutation still means what it meant when it was recorded.
			if (frameDocument.getElementById(CHAT_STYLE_ID)) return;
			injectStyleIntoFrame(frame);
		},
		{ parent: root }
	);
	frameSubscriptions.set(frame, { document: frameDocument, unsubscribe });
}

function getChatFrames(): HTMLIFrameElement[] {
	return Array.from(document.querySelectorAll<HTMLIFrameElement>(CHAT_FRAME_SELECTOR));
}

function getFrameDocument(frame: HTMLIFrameElement): Nullable<Document> {
	try {
		// The chat frame is same origin (`youtube.com/live_chat`), but never let a foreign frame throw here.
		return frame.contentDocument;
	} catch {
		return null;
	}
}

function handleChatFrameLoad(event: Event): void {
	const frame = event.currentTarget ?? event.target;
	if (frame instanceof HTMLIFrameElement) injectStyleIntoFrame(frame);
}

function injectStyleIntoFrame(frame: HTMLIFrameElement): void {
	const frameDocument = getFrameDocument(frame);
	if (!frameDocument) return;
	// A freshly created frame is still on `about:blank`; the load listener re-injects once the chat document is in.
	const root = frameDocument.head ?? frameDocument.documentElement;
	if (!root) return;
	if (!frameDocument.getElementById(CHAT_STYLE_ID)) {
		const style = frameDocument.createElement("style");
		style.id = CHAT_STYLE_ID;
		style.textContent = CHAT_STYLE_TEXT;
		root.appendChild(style);
	}
	ensureFrameSubscription(frame, frameDocument);
}

function registerCleanup(): void {
	if (cleanupRegistered) return;
	cleanupRegistered = true;
	registry.on(FEATURE_NAME, "chat-frames", () => {
		cleanupRegistered = false;
		removeChatFrameHide();
	});
}

function removeInjectedStyles(): void {
	for (const frame of getChatFrames()) {
		getFrameDocument(frame)?.getElementById(CHAT_STYLE_ID)?.remove();
	}
}

function scheduleAttach(): void {
	if (attachTimeout !== null) return;
	attachTimeout = setTimeout(() => {
		attachTimeout = null;
		attachToChatFrames();
	}, ATTACH_DEBOUNCE_MS);
}

function startChatFrameObserver(): void {
	if (unsubscribeBus) return;
	// The iframe is a descendant of the chat frame element YouTube inserts, so the
	// subtree scan is required to find it.
	unsubscribeBus = subscribeToDomMutations(
		CHAT_FRAME_SELECTOR,
		() => {
			scheduleAttach();
		},
		{ deep: true }
	);
}

function stopChatFrameObserver(): void {
	if (attachTimeout !== null) {
		clearTimeout(attachTimeout);
		attachTimeout = null;
	}
	unsubscribeBus?.();
	unsubscribeBus = null;
	disconnectFrameSubscriptions();
}
