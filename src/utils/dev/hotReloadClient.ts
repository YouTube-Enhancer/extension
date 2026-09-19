import { DEV_RELOAD_PORT_FILE, DEV_RELOAD_SOURCE, devReloadPort, type DevRuntimeMessage, type DevServerMessage } from "@/src/utils/dev/hotReload";
import { YOUTUBE_MATCH_PATTERNS } from "@/src/utils/url/constants";

/**
 * Runs in the background worker of development builds only. It listens to the watch pipeline and applies each
 * rebuild in the least disruptive way: a changed embedded script is swapped inside open YouTube tabs without a page
 * reload, a changed content script is re-injected, changed extension pages are reloaded, and a changed background
 * worker or manifest reloads the extension.
 */

const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 30000;

let reconnectDelay = RECONNECT_MIN_MS;
let announcedDisconnect = false;

/**
 * Chrome does not re-run manifest content scripts in tabs that were already open when an extension is reloaded, so
 * the first worker start after a reload injects them again. `chrome.storage.session` survives worker restarts but
 * not extension reloads, which makes it the right place for the "already done" marker.
 */
export async function reinjectContentScriptsAfterReload(): Promise<void> {
	const { devReinjected } = await chrome.storage.session.get("devReinjected");
	if (devReinjected) return;
	await chrome.storage.session.set({ devReinjected: true });
	await reinjectContentScripts();
}

export function startHotReloadClient(): void {
	void connect();
}

async function broadcastToYouTubeTabs(message: DevRuntimeMessage): Promise<void> {
	for (const tab of await youTubeTabs()) {
		try {
			await chrome.tabs.sendMessage(tab.id!, message);
		} catch {
			// A tab without a content script (discarded, or opened before the extension) has nothing to swap.
		}
	}
}

async function connect(): Promise<void> {
	const socket = new WebSocket(`ws://127.0.0.1:${await discoverPort()}`);
	socket.onopen = () => {
		reconnectDelay = RECONNECT_MIN_MS;
		announcedDisconnect = false;
		console.log("[Dev] Connected to the watch pipeline");
	};
	socket.onmessage = (event) => {
		void handle(JSON.parse(String(event.data)) as DevServerMessage);
	};
	socket.onclose = () => {
		if (!announcedDisconnect) {
			announcedDisconnect = true;
			console.log("[Dev] Watch pipeline not reachable; retrying in the background (is `npm run dev` running?)");
		}
		setTimeout(() => void connect(), reconnectDelay);
		reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
	};
	socket.onerror = () => socket.close();
}

/** The port the running pipeline wrote into the output folder; falls back to the compiled-in one. */
async function discoverPort(): Promise<number> {
	try {
		const response = await fetch(chrome.runtime.getURL(DEV_RELOAD_PORT_FILE));
		const { port } = (await response.json()) as { port?: unknown };
		if (typeof port === "number") return port;
	} catch {
		// No file: the build was made without the watch pipeline.
	}
	return devReloadPort();
}

async function handle(message: DevServerMessage): Promise<void> {
	if (message.type === "ping") return;
	const { buildId } = message;
	/**
	 * The build this worker last applied. On connect, a different id means the pipeline (re)started and built while
	 * this extension was not listening, so the whole extension reloads once; the id is stored first, and the worker
	 * that comes back sees the same id in the next hello and stays put.
	 */
	const { devLastBuildId } = await chrome.storage.local.get("devLastBuildId");
	await chrome.storage.local.set({ devLastBuildId: buildId });
	if (message.type === "hello") {
		if (devLastBuildId !== undefined && devLastBuildId !== buildId) {
			console.log(`[Dev] Pipeline built ${buildId} while disconnected; reloading the extension`);
			chrome.runtime.reload();
		}
		return;
	}
	const { targets } = message;
	console.log(`[Dev] Rebuild ${buildId}: ${targets.join(", ")}`);
	if (targets.includes("background") || targets.includes("manifest")) {
		chrome.runtime.reload();
		return;
	}
	if (targets.includes("pages")) await reloadExtensionPages();
	if (targets.includes("content")) {
		await reinjectContentScripts();
	} else if (targets.includes("embedded")) {
		await broadcastToYouTubeTabs({ buildId, source: DEV_RELOAD_SOURCE, type: "reload-embedded" });
	}
}

async function reinjectContentScripts(): Promise<void> {
	for (const tab of await youTubeTabs()) {
		const target = { tabId: tab.id! };
		try {
			/** Tells the new instance it is replacing an older one, so it disposes the running embedded script first. */
			await chrome.scripting.executeScript({
				func: () => {
					(globalThis as { __yteDevReinject?: boolean }).__yteDevReinject = true;
				},
				target
			});
			await chrome.scripting.executeScript({ files: ["src/pages/content/index.js"], target });
		} catch (error) {
			console.warn(`[Dev] Could not re-inject into tab ${tab.id}:`, error);
		}
	}
}

async function reloadExtensionPages(): Promise<void> {
	const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL("*") });
	for (const tab of tabs) {
		if (tab.id !== undefined) await chrome.tabs.reload(tab.id);
	}
}

function youTubeTabs(): Promise<chrome.tabs.Tab[]> {
	return chrome.tabs.query({ url: YOUTUBE_MATCH_PATTERNS }).then((tabs) => tabs.filter((tab) => tab.id !== undefined && !tab.discarded));
}
