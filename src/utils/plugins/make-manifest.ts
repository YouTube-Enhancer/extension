import * as fs from "fs";
import * as path from "path";
import colorLog from "../log";
import { GetInstalledBrowsers } from "get-installed-browsers";
import { manifestV2, manifestV3 } from "../../manifest";
import type { PluginOption } from "vite";
import { outputFolderName } from "../constants";

const { resolve } = path;

const outDir = resolve(__dirname, "..", "..", "..", outputFolderName);
function writeManifest(version: 2 | 3, browserName: string) {
	const manifestPath = resolve(outDir, browserName, `manifest.json`);

	fs.writeFileSync(manifestPath, JSON.stringify(version === 2 ? manifestV2 : manifestV3, null, 2));

	colorLog(`Manifest file copy complete: ${manifestPath}`, "success");
}
export default function makeManifest(): PluginOption {
	return {
		name: "make-manifest",
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
		}
	};
}
