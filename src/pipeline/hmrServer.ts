import type { Manifest } from "webextension-polyfill";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, posix, resolve } from "path";
import { createServer, type Plugin } from "vite";

import extensionServedWorkers from "@/src/utils/plugins/extension-served-workers";
import { pagesDir, rootDir } from "@/src/utils/plugins/utils";

import { findFreePort } from "./ports";

export type HmrServer = {
	close(): Promise<void>;
	origin: string;
	/** Allows the pages to load scripts from the dev server; Manifest V3 permits localhost sources in this policy. */
	patchManifest(manifest: Manifest.WebExtensionManifest): Manifest.WebExtensionManifest;
	/** Rewrites the pages' HTML in the target folder to load from the dev server; run after every pages rebuild. */
	writeHtml(targetDir: string): void;
};

/** Preferred port of the pages dev server; see `findFreePort` for why it may end up elsewhere. */
export const DEV_SERVER_PORT = 40252;

const PREAMBLE_PATH = "/__yte/react-preamble.js";
/** What `@vitejs/plugin-react-swc` injects into HTML it serves itself; the extension's HTML is not served by Vite. */
const PREAMBLE = [
	'import RefreshRuntime from "/@react-refresh";',
	"RefreshRuntime.injectIntoGlobalHook(window);",
	"window.$RefreshReg$ = () => {};",
	"window.$RefreshSig$ = () => (type) => type;",
	"window.__vite_plugin_react_preamble_installed__ = true;",
	""
].join("\n");

/** The extension pages served from the dev server: page folder and HTML file. */
const PAGES = [
	{ file: "index.html", page: "options" },
	{ file: "index.html", page: "popup" },
	{ file: "index.html", page: "devtools" },
	{ file: "panel.html", page: "devtools" }
];

/**
 * True HMR for the React pages (options, popup, devtools): the page HTML written into the extension loads the Vite
 * client, the React refresh preamble and the page's own entry from a local Vite dev server, so a component edit is
 * applied in place with state kept. Everything else (background worker, content scripts, Monaco workers) still comes
 * from the watch build. Chrome only: Manifest V3's `extension_pages` policy accepts a localhost script source, which
 * is what makes loading from the server possible at all.
 */
export async function startHmrServer({ port = DEV_SERVER_PORT }: { port?: number } = {}): Promise<HmrServer> {
	const bound = await findFreePort(port);
	const origin = `http://127.0.0.1:${bound}`;
	const server = await createServer({
		appType: "custom",
		configFile: resolve(rootDir, "vite.config.ts"),
		logLevel: "warn",
		optimizeDeps: { entries: PAGES.map(({ file, page }) => `src/pages/${page}/${file}`) },
		plugins: [extensionServedWorkers(), reactPreamblePlugin()],
		server: { cors: true, hmr: { host: "127.0.0.1", port: bound, protocol: "ws" }, host: "127.0.0.1", port: bound, strictPort: true }
	});
	await server.listen();
	console.log(`[Dev] Pages served with HMR from ${origin}`);

	return {
		async close() {
			await server.close();
		},
		origin,
		patchManifest(manifest) {
			return {
				...manifest,
				content_security_policy: { extension_pages: `script-src 'self' ${origin}; object-src 'self'` }
			};
		},
		writeHtml(targetDir) {
			for (const { file, page } of PAGES) {
				const source = resolve(pagesDir, page, file);
				if (!existsSync(source)) continue;
				const base = `/src/pages/${page}/`;
				const toServer = (reference: string) => (reference.startsWith(".") ? origin + posix.normalize(posix.join(base, reference)) : reference);
				const html = readFileSync(source, "utf8")
					.replace(
						/(<script\b[^>]*\bsrc=")([^"]+)(")/g,
						(_match, before: string, reference: string, after: string) => before + toServer(reference) + after
					)
					.replace(
						/(<link\b[^>]*\bhref=")([^"]+)(")/g,
						(_match, before: string, reference: string, after: string) => before + toServer(reference) + after
					)
					.replace(
						/<head>/i,
						`<head>\n\t\t<script type="module" src="${origin}/@vite/client"></script>\n\t\t<script type="module" src="${origin}${PREAMBLE_PATH}"></script>`
					);
				const target = resolve(targetDir, "src/pages", page, file);
				mkdirSync(dirname(target), { recursive: true });
				writeFileSync(target, html);
			}
		}
	};
}

function reactPreamblePlugin(): Plugin {
	return {
		configureServer(server) {
			server.middlewares.use(PREAMBLE_PATH, (_request, response) => {
				response.setHeader("Content-Type", "application/javascript");
				response.setHeader("Access-Control-Allow-Origin", "*");
				response.end(PREAMBLE);
			});
		},
		name: "yte:react-preamble"
	};
}
