import type { PluginOption } from "vite";

import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";

import { outputFolderName } from "../constants";
import terminalColorLog from "../log";
import { browsers, copyDirectorySync } from "./utils";

const outDir = resolve(__dirname, "..", "..", "..", outputFolderName);

const publicDir = resolve(__dirname, "..", "..", "..", "public");
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
