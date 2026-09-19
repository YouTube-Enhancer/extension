import type { Manifest } from "webextension-polyfill";

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import { manifestV3, manifestV3Firefox } from "@/src/manifest";
import terminalColorLog from "@/src/utils/logging";
import { type Browser, browsers, outDir } from "@/src/utils/plugins/utils";

export type GenerateManifestsOptions = {
	/** Folder whose top-level `*.js` files are listed as web-accessible chunks. Defaults to the temp build output. */
	chunkDir?: string;
	/** Applied to the manifest before it is written; the watch pipeline uses it for development-only entries. */
	patch?: (manifest: Manifest.WebExtensionManifest) => Manifest.WebExtensionManifest;
	targets?: Browser[];
};

/** Writes one manifest per target and returns the JSON written, keyed by target name. */
export default function generateManifests({
	chunkDir = resolve(outDir, "temp", "src"),
	patch,
	targets = browsers
}: GenerateManifestsOptions = {}): Record<string, string> {
	const written: Record<string, string> = {};
	for (const browser of targets) {
		const browserDir = resolve(outDir, browser.name);
		if (!existsSync(browserDir)) {
			mkdirSync(browserDir, { recursive: true });
		}
		const manifest = browser.type === "chrome" ? manifestV3 : manifestV3Firefox;
		written[browser.name] = writeManifest(patch ? patch(manifest) : manifest, browser.name, chunkDir);
	}
	return written;
}

function getChunkScriptPaths(chunkDir: string): string[] {
	if (!existsSync(chunkDir)) return [];
	return readdirSync(chunkDir)
		.filter((fileName) => fileName.endsWith(".js"))
		.map((fileName) => `src/${fileName}`);
}

function writeManifest(manifest: Manifest.WebExtensionManifest, browserName: string, chunkDir: string): string {
	const manifestPath = resolve(outDir, browserName, "manifest.json");
	const chunkScriptPaths = getChunkScriptPaths(chunkDir);
	const webAccessibleResources = (manifest.web_accessible_resources ?? []) as (string | { matches?: string[]; resources?: string[] })[];

	const resolved = {
		...manifest,
		web_accessible_resources: webAccessibleResources.map((entry) => {
			if (typeof entry === "string") return entry;
			return {
				...entry,
				resources: [...new Set([...(entry.resources ?? []), ...chunkScriptPaths])]
			};
		})
	};
	const json = JSON.stringify(resolved);
	writeFileSync(manifestPath, json);
	terminalColorLog(`Manifest file created: ${manifestPath}`, "success");
	return json;
}
