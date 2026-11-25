import browser from "webextension-polyfill";

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
import { waitForReady } from "@/src/utils/embedded/instanceLiveness";

/**
 * Adds a script element to the document's root element, which loads a JavaScript file from the extension's runtime URL.
 */
const injectEmbeddedScript = (buildId?: string) => {
	const script = document.createElement("script");
	script.src =
		browser.runtime.getURL("src/pages/embedded/index.js") + (buildId ? `?b=${buildId}` : "");
	script.type = "module";
	document.documentElement.appendChild(script);
};
let embeddedScriptAppended = false;
const appendEmbeddedScript = () => {
	if (embeddedScriptAppended) return;
	embeddedScriptAppended = true;
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

/**
 * Put the configured level into YouTube's own volume store before this document's player is built.
 *
 * The player reads `yt-player-volume` exactly once - when it constructs itself, long after `base.js`
 * has downloaded and parsed - and starts the video at whatever it finds there, defaulting to 100%
 * when the key is empty. The extension's own `setVolume()` never reaches that store, so without this
 * seed every load plays loud and the features' apply only lands after the first audible frames.
 *
 * Seeding deliberately ignores the features' page gates: an in-page navigation (home feed -> video)
 * never runs `document_start` again, so the document the user is already on is the only one that
 * can put the value in place before the next player boots.
 *
 * Reads its three keys directly instead of going through `getCachedSettings()`, which would warm the
 * cache the page bootstrap answers `request_data options` from - a change arriving before the
 * storage listener is attached would then be served stale.
 */

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
	if (ready) enableStorageForwarding();
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
