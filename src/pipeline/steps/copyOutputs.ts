import { existsSync, rmSync } from "fs";
import { resolve } from "path";

import terminalColorLog from "../../utils/logging";
import { browsers, copyDirectorySync, outDir, publicDir } from "../../utils/plugins/utils";

export default function copyOutputs(): void {
	for (const browser of browsers) {
		const target = resolve(outDir, browser.name);

		if (existsSync(publicDir)) {
			copyDirectorySync(publicDir, target);
			terminalColorLog(`Public directory copied: ${target}`, "success");
		}

		const tempDir = resolve(outDir, "temp");
		if (existsSync(tempDir)) {
			copyDirectorySync(tempDir, target);
			terminalColorLog(`Temp directory copied: ${target}`, "success");
		}
	}

	if (existsSync(resolve(outDir, "temp"))) {
		rmSync(resolve(outDir, "temp"), { recursive: true });
		terminalColorLog("Temp directory deleted", "success");
	}
}
