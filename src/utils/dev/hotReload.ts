/**
 * Shared vocabulary of the development hot-reload channel. Safe to import from the extension and from the Node
 * pipeline; nothing here has side effects.
 */

/**
 * Preferred port of the watch pipeline's reload channel. Windows reserves port ranges for Hyper-V and WinNAT that
 * `netstat` does not show (5195 and 42373 were refused on the first machine this ran on), so the pipeline falls back
 * to a free port and compiles the one it bound into the bundles. `YTE_DEV_RELOAD_PORT` changes the preference.
 */
export const DEV_RELOAD_PORT = 40251;

/**
 * Written into the output folder by the watch pipeline with the port it actually bound. The background worker reads
 * it through `chrome.runtime.getURL` on every connection attempt, so a pipeline restarted on another port is found
 * without rebuilding or reloading the extension.
 */
export const DEV_RELOAD_PORT_FILE = "dev-reload.json";

/** Injected by the watch pipeline through Vite's `define`; absent in builds made without it. */
declare const __YTE_DEV_RELOAD_PORT__: number | undefined;

export function devReloadPort(): number {
	return typeof __YTE_DEV_RELOAD_PORT__ === "number" ? __YTE_DEV_RELOAD_PORT__ : DEV_RELOAD_PORT;
}

/** `source` of every hot-reload message, so they never collide with the extension's own message bus. */
export const DEV_RELOAD_SOURCE = "yte-dev-reload" as const;

/** id of the `<style>` element the embedded bundle injects; removed when the bundle is swapped out. */
export const EMBEDDED_STYLE_ID = "yte-embedded-style";

/** Sent by the background worker to a content script through `chrome.tabs.sendMessage`. */
export type DevRuntimeMessage = { buildId: string; source: typeof DEV_RELOAD_SOURCE; type: "reload-embedded" };

/**
 * Sent by the watch pipeline over the WebSocket. `ping` carries nothing; Chrome ends an idle extension service
 * worker after about 30 s and only WebSocket traffic counts as activity, so the pipeline pings every 20 s.
 */
export type DevServerMessage = { buildId: string; targets: RebuildTarget[]; type: "rebuild" } | { buildId: string; type: "hello" } | { type: "ping" };

/**
 * Posted on the page's `window`, which every content-script instance and the embedded script can see regardless of
 * which extension instance created them. That matters after `chrome.runtime.reload()`: the old content script is
 * orphaned, cannot use `chrome.*` any more, but still hears the takeover and steps aside.
 */
export type DevWindowMessage =
	| { instanceId: string; source: typeof DEV_RELOAD_SOURCE; type: "takeover" }
	| { source: typeof DEV_RELOAD_SOURCE; type: "dispose" }
	| { source: typeof DEV_RELOAD_SOURCE; type: "disposed" };

export type RebuildTarget = "background" | "content" | "embedded" | "manifest" | "pages";

export function isDevRuntimeMessage(data: unknown): data is DevRuntimeMessage {
	return hasDevSource(data) && data.type === "reload-embedded";
}

export function isDevWindowMessage(data: unknown): data is DevWindowMessage {
	return hasDevSource(data) && (data.type === "takeover" || data.type === "dispose" || data.type === "disposed");
}

function hasDevSource(data: unknown): data is { source: typeof DEV_RELOAD_SOURCE; type: string } {
	return typeof data === "object" && data !== null && (data as { source?: unknown }).source === DEV_RELOAD_SOURCE;
}
