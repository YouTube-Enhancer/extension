import type { Nullable } from "@/src/types";

import { type CleanupHandle, setupYouTubePage } from "@/src/_setup/embedded/lifecycle";
import { DEV_MODE } from "@/src/utils/config/env";
import {
	claimSlot,
	getActiveSlotId,
	isSlotHeldBy,
	markReady,
	releaseSlot
} from "@/src/utils/embedded/instanceLiveness";
import { browserColorLog } from "@/src/utils/logging";
import { formatError } from "@/utils/format/error";

const INSTANCE_ID = crypto.randomUUID();

let cleanupHandle: Nullable<CleanupHandle> = null;
let setupInProgress = false;

/**
 * Claim the page-wide instance slot so reinjection cannot stack live copies on a
 * long-lived tab. In development a missed dispose is resolved with the hot-reload
 * protocol; production only waits briefly and takes over (no dev messages).
 */
async function claimInstanceSlot(): Promise<void> {
	await claimSlot(INSTANCE_ID, {
		onTakeover: async () => {
			if (!DEV_MODE) return;
			const { DEV_RELOAD_SOURCE } = await import("@/src/utils/dev/hotReload");
			window.postMessage(
				{ source: DEV_RELOAD_SOURCE, type: "dispose" } satisfies {
					source: typeof DEV_RELOAD_SOURCE;
					type: "dispose";
				},
				"*"
			);
		},
		pollMs: 50,
		timeoutMs: DEV_MODE ? 1500 : 200
	});
}

function initSetup() {
	/**
	 * `pageshow` fires right after `load`, usually before the async setup started on DOMContentLoaded has resolved.
	 * Without this guard the whole lifecycle would run twice.
	 */
	if (setupInProgress || cleanupHandle) return;
	setupInProgress = true;
	void claimInstanceSlot()
		.then(() => setupYouTubePage())
		.then((handle) => {
			// A newer instance may have claimed the slot while we were setting up.
			if (!isSlotHeldBy(INSTANCE_ID) || getActiveSlotId() !== INSTANCE_ID) {
				void handle.dispose({ disableFeatures: true });
				return;
			}
			cleanupHandle = handle;
			// Cross-world readiness for the content script's storage-forwarding gate.
			markReady(INSTANCE_ID);
			return undefined;
		})
		.finally(() => {
			setupInProgress = false;
		})
		.catch((err) => {
			releaseSlot(INSTANCE_ID);
			browserColorLog(`Setup failed: ${formatError(err)}`, "FgRed");
		});
}

if (window.self === window.top) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initSetup);
	} else {
		initSetup();
	}
}

const onPageHide = (event: PageTransitionEvent) => {
	/**
	 * bfcache restore expects the page to come back as it was. Disposing sessions here would
	 * kill bus subscriptions while the orchestrator still thinks features are enabled.
	 * Real unload still tears down below.
	 */
	if (event.persisted) return;
	void cleanupHandle?.dispose();
	cleanupHandle = null;
	releaseSlot(INSTANCE_ID);
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
	if (!isExtensionError(event.filename, event.error instanceof Error ? event.error.stack : null))
		return;
	event.preventDefault();
	const errorLine =
		event.error instanceof Error && typeof event.error.stack === "string"
			? event.error.stack
			: `${event.filename}:${event.lineno}:${event.colno}`;
	const errorMessage =
		event.error instanceof Error ? formatError(event.error) : event.message || "Unknown error";
	browserColorLog(`${errorMessage}\nAt: ${errorLine}`, "FgRed");
};
window.addEventListener("error", onError);

const onUnhandledRejection = (event: PromiseRejectionEvent) => {
	if (!isExtensionError("", event.reason instanceof Error ? event.reason.stack : null)) return;
	event.preventDefault();
	const errorLine =
		event.reason instanceof Error && event.reason?.stack
			? event.reason.stack
			: "Stack trace not available";
	browserColorLog(`Unhandled rejection: ${errorLine}`, "FgRed");
};
window.addEventListener("unhandledrejection", onUnhandledRejection);

/**
 * Development only. Loaded through a dynamic import so production bundles never pull
 * the hot-reload vocabulary or the dispose protocol.
 */
async function startHotReloadBridge(): Promise<void> {
	const { DEV_RELOAD_SOURCE, EMBEDDED_STYLE_ID, isDevWindowMessage } =
		await import("@/src/utils/dev/hotReload");

	const onDevMessage = (event: MessageEvent) => {
		if (event.source !== window || !isDevWindowMessage(event.data) || event.data.type !== "dispose")
			return;
		window.removeEventListener("message", onDevMessage);
		void disposeForHotReload();
	};
	window.addEventListener("message", onDevMessage);

	async function disposeForHotReload(): Promise<void> {
		try {
			await cleanupHandle?.dispose({ disableFeatures: true });
		} catch (error) {
			console.error("Hot reload dispose failed:", error);
		} finally {
			cleanupHandle = null;
			releaseSlot(INSTANCE_ID);
			window.removeEventListener("pagehide", onPageHide);
			window.removeEventListener("pageshow", onPageShow);
			window.removeEventListener("error", onError);
			window.removeEventListener("unhandledrejection", onUnhandledRejection);
			document.getElementById(EMBEDDED_STYLE_ID)?.remove();
			// The feature menu is created once per page and reused if found, so the replacement must build its own.
			document.querySelector("#yte-feature-menu-button")?.remove();
			document.querySelector("#yte-feature-menu")?.remove();
			window.postMessage(
				{ source: DEV_RELOAD_SOURCE, type: "disposed" } satisfies {
					source: typeof DEV_RELOAD_SOURCE;
					type: "disposed";
				},
				"*"
			);
		}
	}
}

if (DEV_MODE) {
	void startHotReloadBridge();
}

// Lazy extension origin — computed on first error, avoids module-level webextension-polyfill import
function getExtensionOrigin(): string {
	const polyfill = (globalThis as Record<string, unknown>).browser as
		| undefined
		| { runtime?: { getURL: (path: string) => string } };
	const chromeApi = (globalThis as Record<string, unknown>).chrome as
		| undefined
		| { runtime?: { getURL: (path: string) => string } };
	const getURL = polyfill?.runtime?.getURL ?? chromeApi?.runtime?.getURL;
	if (!getURL) return "";
	try {
		return getURL("").replace(/\/$/, "");
	} catch {
		return "";
	}
}
