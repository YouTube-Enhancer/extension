import type { PluginOption } from "vite";

import { rmSync } from "fs";
import { resolve } from "path";

import { outputFolderName } from "../constants";
import terminalColorLog from "../log";
import { browsers, copyDirectorySync } from "./utils";

const outDir = resolve(__dirname, "..", "..", "..", outputFolderName);
export default function copyBuild(): PluginOption {
	return {
		closeBundle() {
			for (const browser of browsers) {
				copyDirectorySync(resolve(outDir, "temp"), resolve(outDir, browser.name));
				terminalColorLog(`Build copy complete: ${resolve(outDir, browser.name)}`, "success");
			}
			rmSync(resolve(outDir, "temp"), { recursive: true });
		},
		name: "copy-build"
	};
}
