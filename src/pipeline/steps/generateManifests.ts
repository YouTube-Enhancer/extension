import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import { manifestV2, manifestV3 } from "../../manifest";
import terminalColorLog from "../../utils/log";
import { browsers, outDir } from "../../utils/plugins/utils";

export function generateManifests(): void {
	for (const browser of browsers) {
		const browserDir = resolve(outDir, browser.name);
		if (!existsSync(browserDir)) {
			mkdirSync(browserDir, { recursive: true });
		}
		writeManifest(browser.type === "chrome" ? 3 : 2, browser.name);
	}
}

function writeManifest(version: 2 | 3, browserName: string): void {
	const manifestPath = resolve(outDir, browserName, "manifest.json");
	writeFileSync(manifestPath, JSON.stringify(version === 2 ? manifestV2 : manifestV3));
	terminalColorLog(`Manifest file created: ${manifestPath}`, "success");
}
