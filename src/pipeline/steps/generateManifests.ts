import type { Manifest } from "webextension-polyfill";

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import { manifestV3, manifestV3Firefox } from "@/src/manifest";
import terminalColorLog from "@/src/utils/logging";
import { browsers, outDir } from "@/src/utils/plugins/utils";

export default function generateManifests(): void {
	for (const browser of browsers) {
		const browserDir = resolve(outDir, browser.name);
		if (!existsSync(browserDir)) {
			mkdirSync(browserDir, { recursive: true });
		}
		const manifest = browser.type === "chrome" ? manifestV3 : manifestV3Firefox;
		writeManifest(manifest, browser.name);
	}
}

function getChunkScriptPaths(): string[] {
	const srcDir = resolve(outDir, "temp", "src");
	if (!existsSync(srcDir)) return [];
	return readdirSync(srcDir)
		.filter((fileName) => fileName.endsWith(".js"))
		.map((fileName) => `src/${fileName}`);
}

function writeManifest(manifest: Manifest.WebExtensionManifest, browserName: string): void {
	const manifestPath = resolve(outDir, browserName, "manifest.json");
	const chunkScriptPaths = getChunkScriptPaths();
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
	writeFileSync(manifestPath, JSON.stringify(resolved));
	terminalColorLog(`Manifest file created: ${manifestPath}`, "success");
}
