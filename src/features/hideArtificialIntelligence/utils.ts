import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { cleanupRegistry } from "@/src/features/_registry/cleanupRegistry";

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

let attachTimeout: Nullable<ReturnType<typeof setTimeout>> = null;
let chatFrameObserver: Nullable<MutationObserver> = null;
let cleanupRegistered = false;

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
	if (frameDocument.getElementById(CHAT_STYLE_ID)) return;
	const style = frameDocument.createElement("style");
	style.id = CHAT_STYLE_ID;
	style.textContent = CHAT_STYLE_TEXT;
	root.appendChild(style);
}

function registerCleanup(): void {
	if (cleanupRegistered) return;
	cleanupRegistered = true;
	cleanupRegistry.add(FEATURE_NAME, () => {
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
	if (chatFrameObserver) return;
	const { documentElement } = document;
	if (!documentElement) return;
	// The chat frame is inserted long after the watch page settles and is re-created on every SPA navigation.
	chatFrameObserver = new MutationObserver(scheduleAttach);
	chatFrameObserver.observe(documentElement, { childList: true, subtree: true });
}

function stopChatFrameObserver(): void {
	if (attachTimeout !== null) {
		clearTimeout(attachTimeout);
		attachTimeout = null;
	}
	chatFrameObserver?.disconnect();
	chatFrameObserver = null;
}
