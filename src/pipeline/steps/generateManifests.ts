import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import { manifestV2, manifestV3 } from "../../manifest";
import terminalColorLog from "../../utils/logging";
import { browsers, outDir } from "../../utils/plugins/utils";

export default function generateManifests(): void {
	for (const browser of browsers) {
		const browserDir = resolve(outDir, browser.name);
		if (!existsSync(browserDir)) {
			mkdirSync(browserDir, { recursive: true });
		}
		writeManifest(browser.type === "chrome" ? 3 : 2, browser.name);
	}
}

function getChunkScriptPaths(): string[] {
	const srcDir = resolve(outDir, "temp", "src");
	if (!existsSync(srcDir)) return [];
	return readdirSync(srcDir)
		.filter((fileName) => fileName.endsWith(".js"))
		.map((fileName) => `src/${fileName}`);
}

function writeManifest(version: 2 | 3, browserName: string): void {
	const manifestPath = resolve(outDir, browserName, "manifest.json");
	const chunkScriptPaths = getChunkScriptPaths();

	if (version === 2) {
		const manifest = {
			...manifestV2,
			web_accessible_resources: [...new Set([...(manifestV2.web_accessible_resources ?? []), ...chunkScriptPaths])]
		};
		writeFileSync(manifestPath, JSON.stringify(manifest));
	} else {
		const manifest = {
			...manifestV3,
			web_accessible_resources: (manifestV3.web_accessible_resources ?? []).map((entry) => {
				if (typeof entry === "string") return entry;
				return {
					...entry,
					resources: [...new Set([...(entry.resources ?? []), ...chunkScriptPaths])]
				};
			})
		};
		writeFileSync(manifestPath, JSON.stringify(manifest));
	}
	terminalColorLog(`Manifest file created: ${manifestPath}`, "success");
}
