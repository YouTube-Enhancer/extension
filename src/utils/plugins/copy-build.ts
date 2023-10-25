import * as fs from "fs";
import * as path from "path";
import terminalColorLog from "../log";
import { GetInstalledBrowsers } from "get-installed-browsers";
import type { PluginOption } from "vite";
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from "fs";
import { join } from "path";
import { outputFolderName } from "../constants";
function copyDirectorySync(sourceDir: string, targetDir: string) {
	// Create the target directory if it doesn't exist
	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}

	// Get a list of all files and subdirectories in the source directory
	const items = readdirSync(sourceDir);

	for (const item of items) {
		const sourcePath = join(sourceDir, item);
		const targetPath = join(targetDir, item);

		// Check if the current item is a directory
		if (statSync(sourcePath).isDirectory()) {
			// Recursively copy the subdirectory
			copyDirectorySync(sourcePath, targetPath);
		} else {
			// Copy the file
			copyFileSync(sourcePath, targetPath);
		}
	}
}
const { resolve } = path;

const outDir = resolve(__dirname, "..", "..", "..", outputFolderName);
export default function copyBuild(): PluginOption {
	return {
		name: "copy-build",
		closeBundle() {
			const browsers = GetInstalledBrowsers();
			if (!fs.existsSync(outDir)) {
				fs.mkdirSync(outDir);
			}
			for (const browser of browsers) {
				copyDirectorySync(resolve(outDir, "temp"), resolve(outDir, browser.name));
				terminalColorLog(`Build copy complete: ${resolve(outDir, browser.name)}`, "success");
			}
			fs.rmSync(resolve(outDir, "temp"), { recursive: true });
		}
	};
}
