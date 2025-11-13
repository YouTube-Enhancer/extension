import type { PluginOption } from "vite";

import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";

import terminalColorLog from "../log";
import { browsers, copyDirectorySync, outDir, publicDir } from "./utils";

export default function copyPublic(): PluginOption {
	return {
		closeBundle() {
			for (const browser of browsers) {
				if (!existsSync(resolve(outDir, browser.name))) {
					mkdirSync(resolve(outDir, browser.name), { recursive: true });
				}
				copyDirectorySync(publicDir, resolve(outDir, browser.name));
				terminalColorLog(`Public directory copy complete: ${resolve(outDir, browser.name)}`, "success");
			}
		},
		name: "copy-public"
	};
}
