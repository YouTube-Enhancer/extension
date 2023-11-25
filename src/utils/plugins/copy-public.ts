import type { PluginOption } from "vite";

import { existsSync, mkdirSync } from "fs";
import { GetInstalledBrowsers } from "get-installed-browsers";
import { resolve } from "path";

import { outputFolderName } from "../constants";
import terminalColorLog from "../log";
import { copyDirectorySync } from "./utils";

const outDir = resolve(__dirname, "..", "..", "..", outputFolderName);

const publicDir = resolve(__dirname, "..", "..", "..", "public");
export default function copyPublic(): PluginOption {
	return {
		buildEnd() {
			const browsers = GetInstalledBrowsers();
			if (!existsSync(outDir)) {
				mkdirSync(outDir);
			}
			for (const browser of browsers) {
				if (!existsSync(resolve(outDir, browser.name))) {
					mkdirSync(resolve(outDir, browser.name));
				}
				copyDirectorySync(publicDir, resolve(outDir, browser.name));
				terminalColorLog(`Public directory copy complete: ${resolve(outDir, browser.name)}`, "success");
			}
		},
		name: "copy-public"
	};
}
