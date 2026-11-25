import browser from "webextension-polyfill";

import type { ContentToBackgroundSendOnlyMessages } from "@/src/types";

import { startDevelopmentMode } from "@/src/pages/content/development";
import { storageListeners } from "@/src/pages/content/storageForwarding";
import { seedPersistedVolumeAtStart } from "@/src/pages/content/volumeSeeding";
import {
	defaultConfiguration,
	onWindowMessage,
	registerStorageForwardingHooks,
	storage
} from "@/src/pages/content/windowMessageDispatcher";
import { DEV_MODE } from "@/src/utils/config/env";
import { READY_ATTR, waitForReady } from "@/src/utils/embedded/instanceLiveness";

/**
 * Page-visible extension origin, set unconditionally (dev and prod) from this isolated-world
 * document_start script. Plan 061 removed the page-world `<script src="…/src/pages/embedded/index.js">`
 * tag, which used to expose the same origin through its `src`; the test harness reads this attribute
 * instead of waiting for a tag that no longer exists. Not a new leak: pre-061 the origin was already
 * page-visible via the web-accessible script tag (same value, same audience).
 */
document.documentElement.setAttribute("data-yte-extension-origin", browser.runtime.getURL(""));

/** SPA navigations reuse the document, so the bundle is injected once per document (see below). */
let embeddedScriptInjected = false;
/**
 * Chrome ≥157 refuses the page-initiated `chrome-extension://` **module** script tag that used
 * to deliver the embedded bundle ("Unsafe attempt to load URL ... from frame with URL ..."),
 * so the content script asks the background worker to inject it into the page world instead:
 * `chrome.scripting.executeScript({ world: "MAIN", files: [...], injectImmediately: true })`.
 * The message is the only trigger; the bundle is a self-contained IIFE, so no WAR entry is
 * needed for the load itself.
 *
 * `force` bypasses the per-document latch for the development hot-reload swap, where a fresh
 * copy must replace the disposed instance inside the same document.
 */
const injectEmbeddedScript = (force = false): void => {
	/** SPA navigations reuse the document: one injection per document, as the tag latch did. */
	if (embeddedScriptInjected && !force) return;
	embeddedScriptInjected = true;
	void browser.runtime
		.sendMessage({
			action: "request_action",
			data: undefined,
			source: "content",
			type: "injectEmbedded"
		} satisfies ContentToBackgroundSendOnlyMessages)
		.catch((error: unknown) => {
			/**
			 * A rejected send means the background never answered, so nothing was injected.
			 * Drop the latch so a later request (dev swap, a retry) can still try.
			 */
			embeddedScriptInjected = false;
			console.error("[yte] Embedded-script injection request failed:", error);
		});
};
const appendEmbeddedScript = () => {
	injectEmbeddedScript();
};
const scheduleEmbeddedScript = () => {
	if (document.readyState === "loading") {
		document.addEventListener("readystatechange", () => {
			if (document.readyState === "interactive") appendEmbeddedScript();
		});
	} else {
		appendEmbeddedScript();
	}
};

void seedPersistedVolumeAtStart();

/**
 * State only reaches the page in response to an explicit request; the embedded script asks for
 * what it needs (bootstrap, and videoHistory per navigation) instead of receiving a startup
 * broadcast of the complete persisted state.
 */
const onPageHide = (event?: PageTransitionEvent) => {
	// A bfcache (persisted) hide keeps the document alive with features still enabled, so the
	// forwarding listener must survive it — only a real unload detaches. The parameter is
	// optional only because development mode holds this handler as a `() => void` dep (it merely
	// unregisters it); as a pagehide listener the event is always supplied by the DOM.
	if (event && event.persisted) return;
	storage.onChanged.removeListener(storageListeners);
	document.documentElement.removeAttribute("yte-ready");
};
/**
 * Belt and braces with the pagehide gate: after a bfcache restore, re-ensure the listener is
 * attached. Remove-then-add is idempotent, so double registration is impossible whichever event
 * ordering the browser uses. Runs only when forwarding was enabled, so a page that never reached
 * readiness does not gain the listener here.
 */
const onPageShow = (event: PageTransitionEvent) => {
	if (!event.persisted || !storageForwardingEnabled) return;
	storage.onChanged.removeListener(storageListeners);
	storage.onChanged.addListener(storageListeners);
};
let storageForwardingEnabled = false;
const enableStorageForwarding = (): void => {
	if (storageForwardingEnabled) return;
	storageForwardingEnabled = true;
	storage.onChanged.addListener(storageListeners);
	window.addEventListener("pagehide", onPageHide);
	window.addEventListener("pageshow", onPageShow);
};
/**
 * Storage forwarding waits for the embedded instance to publish readiness
 * (DOM marker from the liveness module). pageLoaded remains a faster path.
 */
void waitForReady(30000).then((ready) => {
	if (ready) {
		enableStorageForwarding();
		return undefined;
	}
	/**
	 * Loud on purpose. Before this warn, a refused page-world injection only surfaced as a
	 * dead page-side bridge 30 s later; production consoles must see the failure at once.
	 */
	console.warn(
		`[yte] waitForReady timed out after 30000 ms: document.documentElement never published ` +
			`the ${READY_ATTR} attribute, so the page-world embedded script is not running ` +
			`(injection was refused or the bundle threw). Storage forwarding stays disabled.`
	);
	return undefined;
});

// The dispatcher enables forwarding from its pageLoaded / test-write cases; index.ts owns the
// registration because the forwarding block is this file's until slice 2 moves it out.
registerStorageForwardingHooks({
	enable: enableStorageForwarding,
	isEnabled: () => storageForwardingEnabled
});
window.addEventListener("message", onWindowMessage);

/**
 * Content scripts are classic scripts (manifest), not ES modules. A dynamic import here
 * made Rolldown emit __vitePreload with `import.meta`, which throws in a classic script.
 * Start development mode with a static import instead; production tree-shakes the call.
 */
if (DEV_MODE) {
	startDevelopmentMode({
		defaultConfiguration,
		injectEmbeddedScript,
		onPageHide,
		onWindowMessage,
		scheduleEmbeddedScript,
		storage,
		storageListeners
	});
} else {
	scheduleEmbeddedScript();
}
