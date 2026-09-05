import type { Nullable } from "@/src/types";

import { setupYouTubePage } from "@/src/_setup/embedded/lifecycle";
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

window.addEventListener("pagehide", () => {
	cleanupHandle?.dispose();
	cleanupHandle = null;
});
window.addEventListener("pageshow", () => {
	if (!cleanupHandle) {
		initSetup();
	}
});
function isExtensionError(filename: string, stack?: Nullable<string>): boolean {
	const origin = getExtensionOrigin();
	if (!origin) return false;
	return filename.startsWith(origin) || (stack ? stack.includes(origin) : false);
}
window.addEventListener("error", (event: ErrorEvent) => {
	if (!isExtensionError(event.filename, event.error instanceof Error ? event.error.stack : null)) return;
	event.preventDefault();
	const errorLine =
		event.error instanceof Error && typeof event.error.stack === "string" ? event.error.stack : `${event.filename}:${event.lineno}:${event.colno}`;
	const errorMessage = event.error instanceof Error ? formatError(event.error) : event.message || "Unknown error";
	browserColorLog(`${errorMessage}\nAt: ${errorLine}`, "FgRed");
});

window.addEventListener("unhandledrejection", (event) => {
	if (!isExtensionError("", event.reason instanceof Error ? event.reason.stack : null)) return;
	event.preventDefault();
	const errorLine = event.reason instanceof Error && event.reason?.stack ? event.reason.stack : "Stack trace not available";
	browserColorLog(`Unhandled rejection: ${errorLine}`, "FgRed");
});

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
