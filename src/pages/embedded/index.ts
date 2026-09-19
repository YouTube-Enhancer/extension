import type { Nullable } from "@/src/types";

import { setupYouTubePage } from "@/src/_setup/embedded/lifecycle";
import { registry } from "@/src/features/_registry/featureRegistry";
import { DEV_MODE } from "@/src/utils/config/env";
import { DEV_RELOAD_SOURCE, type DevWindowMessage, EMBEDDED_STYLE_ID, isDevWindowMessage } from "@/src/utils/dev/hotReload";
import { browserColorLog } from "@/src/utils/logging";
import { formatError } from "@/utils/format/error";

let cleanupHandle: Nullable<{ dispose(): void }> = null;
let setupInProgress = false;

function initSetup() {
	/**
	 * `pageshow` fires right after `load`, usually before the async setup started on DOMContentLoaded has resolved.
	 * Without this guard the whole lifecycle would run twice.
	 */
	if (setupInProgress || cleanupHandle) return;
	setupInProgress = true;
	setupYouTubePage()
		.then((handle) => {
			cleanupHandle = handle;
			return undefined;
		})
		.finally(() => {
			setupInProgress = false;
		})
		.catch((err) => browserColorLog(`Setup failed: ${formatError(err)}`, "FgRed"));
}

if (window.self === window.top) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initSetup);
	} else {
		initSetup();
	}
}

const onPageHide = () => {
	cleanupHandle?.dispose();
	cleanupHandle = null;
};
const onPageShow = () => {
	if (!cleanupHandle) {
		initSetup();
	}
};
window.addEventListener("pagehide", onPageHide);
window.addEventListener("pageshow", onPageShow);
function isExtensionError(filename: string, stack?: Nullable<string>): boolean {
	const origin = getExtensionOrigin();
	if (!origin) return false;
	return filename.startsWith(origin) || (stack ? stack.includes(origin) : false);
}
const onError = (event: ErrorEvent) => {
	if (!isExtensionError(event.filename, event.error instanceof Error ? event.error.stack : null)) return;
	event.preventDefault();
	const errorLine =
		event.error instanceof Error && typeof event.error.stack === "string" ? event.error.stack : `${event.filename}:${event.lineno}:${event.colno}`;
	const errorMessage = event.error instanceof Error ? formatError(event.error) : event.message || "Unknown error";
	browserColorLog(`${errorMessage}\nAt: ${errorLine}`, "FgRed");
};
window.addEventListener("error", onError);

const onUnhandledRejection = (event: PromiseRejectionEvent) => {
	if (!isExtensionError("", event.reason instanceof Error ? event.reason.stack : null)) return;
	event.preventDefault();
	const errorLine = event.reason instanceof Error && event.reason?.stack ? event.reason.stack : "Stack trace not available";
	browserColorLog(`Unhandled rejection: ${errorLine}`, "FgRed");
};
window.addEventListener("unhandledrejection", onUnhandledRejection);

if (DEV_MODE) {
	/**
	 * Hot reload: the content script asks this instance to step aside before it injects a rebuilt copy. Every feature
	 * is disabled through its own lifecycle, then the page-level listeners and the injected style go, so the fresh
	 * instance starts on a page that looks like a first load. The video keeps playing throughout.
	 */
	const onDevMessage = (event: MessageEvent) => {
		if (event.source !== window || !isDevWindowMessage(event.data) || event.data.type !== "dispose") return;
		window.removeEventListener("message", onDevMessage);
		void disposeForHotReload();
	};
	window.addEventListener("message", onDevMessage);
}

async function disposeForHotReload(): Promise<void> {
	try {
		await registry.disableAll();
	} catch (error) {
		browserColorLog(`Hot reload: disableAll failed: ${formatError(error)}`, "FgRed");
	}
	cleanupHandle?.dispose();
	cleanupHandle = null;
	window.removeEventListener("pagehide", onPageHide);
	window.removeEventListener("pageshow", onPageShow);
	window.removeEventListener("error", onError);
	window.removeEventListener("unhandledrejection", onUnhandledRejection);
	document.getElementById(EMBEDDED_STYLE_ID)?.remove();
	// The feature menu is created once per page and reused if found, so the replacement must build its own.
	document.querySelector("#yte-feature-menu-button")?.remove();
	document.querySelector("#yte-feature-menu")?.remove();
	window.postMessage({ source: DEV_RELOAD_SOURCE, type: "disposed" } satisfies DevWindowMessage, "*");
}

// Lazy extension origin — computed on first error, avoids module-level webextension-polyfill import
function getExtensionOrigin(): string {
	const polyfill = (globalThis as Record<string, unknown>).browser as undefined | { runtime?: { getURL: (path: string) => string } };
	const chromeApi = (globalThis as Record<string, unknown>).chrome as undefined | { runtime?: { getURL: (path: string) => string } };
	const getURL = polyfill?.runtime?.getURL ?? chromeApi?.runtime?.getURL;
	if (!getURL) return "";
	try {
		return getURL("").replace(/\/$/, "");
	} catch {
		return "";
	}
}
