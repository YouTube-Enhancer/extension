import { existsSync } from "fs";
import { resolve } from "path";

import terminalColorLog from "@/src/utils/logging";
import { browsers, copyDirectory, outDir, publicDir } from "@/src/utils/plugins/utils";

export default async function copyOutputs(): Promise<void> {
	for (const browser of browsers) {
		const target = resolve(outDir, browser.name);

		if (existsSync(publicDir)) {
			await copyDirectory(publicDir, target);
			terminalColorLog(`Public directory copied: ${target}`, "success");
		}

		const tempDir = resolve(outDir, "temp");
		if (existsSync(tempDir)) {
			await copyDirectory(tempDir, target);
			terminalColorLog(`Temp directory copied: ${target}`, "success");
		}
	}

	const tempDir = resolve(outDir, "temp");
	if (existsSync(tempDir)) {
		const { rm } = await import("fs/promises");
		await rm(tempDir, { recursive: true });
		terminalColorLog("Temp directory deleted", "success");
	}
}
