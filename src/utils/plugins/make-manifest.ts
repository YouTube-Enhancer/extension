import type { PluginOption } from "vite";

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import { manifestV2, manifestV3 } from "../../manifest";
import { outputFolderName } from "../constants";
import terminalColorLog from "../log";
import { browsers } from "./utils";

const outDir = resolve(__dirname, "..", "..", "..", outputFolderName);
function writeManifest(version: 2 | 3, browserName: string) {
	const manifestPath = resolve(outDir, browserName, `manifest.json`);

	writeFileSync(manifestPath, JSON.stringify(version === 2 ? manifestV2 : manifestV3, null, 2));

	terminalColorLog(`Manifest file copy complete: ${manifestPath}`, "success");
}
export default function makeManifest(): PluginOption {
	return {
		closeBundle() {
			for (const browser of browsers) {
				if (!existsSync(resolve(outDir, browser.name))) {
					mkdirSync(resolve(outDir, browser.name), { recursive: true });
				}
				writeManifest(browser.type === "chrome" ? 3 : 2, browser.name);
			}
		},
		name: "make-manifest"
	};
}
