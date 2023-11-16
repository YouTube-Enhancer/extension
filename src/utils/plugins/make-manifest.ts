import type { PluginOption } from "vite";

import * as fs from "fs";
import { GetInstalledBrowsers } from "get-installed-browsers";
import * as path from "path";

import { manifestV2, manifestV3 } from "../../manifest";
import { outputFolderName } from "../constants";
import terminalColorLog from "../log";
const { resolve } = path;

const outDir = resolve(__dirname, "..", "..", "..", outputFolderName);
function writeManifest(version: 2 | 3, browserName: string) {
	const manifestPath = resolve(outDir, browserName, `manifest.json`);

	fs.writeFileSync(manifestPath, JSON.stringify(version === 2 ? manifestV2 : manifestV3, null, 2));

	terminalColorLog(`Manifest file copy complete: ${manifestPath}`, "success");
}
export default function makeManifest(): PluginOption {
	return {
		buildEnd() {
			const browsers = GetInstalledBrowsers();
			if (!fs.existsSync(outDir)) {
				fs.mkdirSync(outDir);
			}
			for (const browser of browsers) {
				if (!fs.existsSync(resolve(outDir, browser.name))) {
					fs.mkdirSync(resolve(outDir, browser.name));
				}
				writeManifest(browser.type === "chrome" ? 3 : 2, browser.name);
			}
		},
		name: "make-manifest"
	};
}
