import type { AddressInfo } from "net";

import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { WebSocketServer } from "ws";

import { DEV_RELOAD_PORT, DEV_RELOAD_PORT_FILE, type DevServerMessage, type RebuildTarget } from "@/src/utils/dev/hotReload";

import { isBuilding, onRebuild, type RebuildEvent } from "./devEvents";

export type HotReloadServer = {
	close(): Promise<void>;
	/** Resolves with the port actually bound; the preferred one may be reserved by the OS or in use. */
	ready: Promise<number>;
};

/**
 * Rebuilds that land within this window, or while another bundle is still building, are announced together, so a
 * save that touches several bundles causes one reload with the final files.
 */
const COALESCE_MS = 300;
const KEEPALIVE_MS = 20000;

/**
 * Tells development builds of the extension what changed. The background worker connects over a WebSocket (Chrome
 * keeps a service worker alive while one is open) and decides per message whether to swap the embedded script in
 * place, re-inject the content script, reload extension pages, or reload the whole extension. Windows reserves port
 * ranges for Hyper-V that `netstat` does not show, so when the preferred port is refused a free one is used and the
 * watch pipeline compiles that port into the bundles.
 */
export function startHotReloadServer({ port = DEV_RELOAD_PORT, targetDir }: { port?: number; targetDir: string }): HotReloadServer {
	let server: null | WebSocketServer = null;
	let buildId = "0";
	let backgroundDigest = digestEntryGraph(targetDir, BACKGROUND_ENTRY);
	let pagesDigest = digestEntryGraph(targetDir, ...PAGE_ENTRIES);
	const pending = new Set<RebuildTarget>();
	let flushTimer: NodeJS.Timeout | undefined;

	const listen = (candidate: number) =>
		new Promise<number>((resolve, reject) => {
			const candidateServer = new WebSocketServer({ host: "127.0.0.1", port: candidate });
			candidateServer.once("error", reject);
			candidateServer.once("listening", () => {
				server = candidateServer;
				candidateServer.on("connection", (socket) => {
					socket.send(JSON.stringify({ buildId, type: "hello" } satisfies DevServerMessage));
				});
				resolve((candidateServer.address() as AddressInfo).port);
			});
		});
	const ready = listen(port)
		.catch((error: Error) => {
			console.log(`[Dev] Port ${port} is not available (${error.message.split(":")[1]?.trim() ?? error.message}); picking a free one`);
			return listen(0);
		})
		.then((bound) => {
			console.log(`[Dev] Hot reload channel on ws://127.0.0.1:${bound}`);
			writeFileSync(resolve(targetDir, DEV_RELOAD_PORT_FILE), JSON.stringify({ port: bound }));
			return bound;
		});
	/** Only WebSocket traffic keeps an otherwise idle extension service worker alive; Chrome ends it after ~30 s. */
	const keepAlive = setInterval(() => {
		const ping = JSON.stringify({ type: "ping" } satisfies DevServerMessage);
		for (const client of server?.clients ?? []) if (client.readyState === client.OPEN) client.send(ping);
	}, KEEPALIVE_MS);

	const flush = () => {
		if (!pending.size || !server) return;
		if (isBuilding()) {
			/** A save that touches several bundles: wait for the slow ones, or the fast one re-injects stale files. */
			flushTimer = setTimeout(flush, 100);
			return;
		}
		const targets = [...pending];
		pending.clear();
		const message = JSON.stringify({ buildId, targets, type: "rebuild" } satisfies DevServerMessage);
		let clients = 0;
		for (const client of server.clients) {
			if (client.readyState === client.OPEN) {
				client.send(message);
				clients++;
			}
		}
		console.log(`[Dev] Reload ${buildId}: ${targets.join(", ")} (${clients} client${clients === 1 ? "" : "s"})`);
	};

	const unsubscribe = onRebuild((event) => {
		({ buildId } = event);
		for (const target of classify(event)) pending.add(target);
		clearTimeout(flushTimer);
		flushTimer = setTimeout(flush, COALESCE_MS);
	});

	function classify(event: RebuildEvent): RebuildTarget[] {
		switch (event.bundle) {
			case "content":
				return ["content"];
			case "embedded":
				return ["embedded"];
			case "manifest":
				return ["manifest"];
			case "pages": {
				/**
				 * The pages bundle holds the background worker, the extension pages, and in development the lazily
				 * loaded feature chunks the devtools panel can reach, so it rebuilds on many saves that change nothing
				 * it ships. Only the worker's own import graph warrants an extension reload, only a page's own graph
				 * warrants a page reload, and an unchanged output is not announced at all.
				 */
				const nextBackground = digestEntryGraph(targetDir, BACKGROUND_ENTRY);
				const nextPages = digestEntryGraph(targetDir, ...PAGE_ENTRIES);
				const backgroundChanged = nextBackground !== backgroundDigest;
				const pagesChanged = nextPages !== pagesDigest;
				backgroundDigest = nextBackground;
				pagesDigest = nextPages;
				if (backgroundChanged) return ["background"];
				return pagesChanged ? ["pages"] : [];
			}
			case "public":
				// Locale files are fetched by the embedded script, so a swap picks them up. contentStyle.css needs a tab reload.
				return ["embedded"];
		}
	}

	return {
		async close() {
			unsubscribe();
			clearTimeout(flushTimer);
			clearInterval(keepAlive);
			await ready.catch(() => 0);
			if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
		},
		ready
	};
}

const BACKGROUND_ENTRY = "src/pages/background/index.js";
const PAGE_ENTRIES = ["src/pages/options/index.js", "src/pages/popup/index.js", "src/pages/devtools/index.js", "src/pages/devtools/panel.js"];

/** Hashes the given entries and every chunk they import, directly or indirectly (static imports only). */
function digestEntryGraph(targetDir: string, ...entries: string[]): string {
	const hash = createHash("sha1");
	const seen = new Set<string>();
	const visit = (file: string) => {
		if (seen.has(file) || !existsSync(file)) return;
		seen.add(file);
		const code = readFileSync(file, "utf8");
		hash.update(file);
		hash.update(code);
		for (const match of code.matchAll(/(?:^|[\s;])import\s*(?:[^'"]*?from\s*)?["'](\.[^"']+)["']/g)) {
			visit(resolve(dirname(file), match[1]));
		}
	};
	for (const entry of entries) visit(resolve(targetDir, entry));
	return hash.digest("hex");
}
