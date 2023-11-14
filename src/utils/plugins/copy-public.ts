import type { PluginOption } from "vite";

import * as fs from "fs";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { GetInstalledBrowsers } from "get-installed-browsers";
import * as path from "path";
import { join } from "path";

import { outputFolderName } from "../constants";
import terminalColorLog from "../log";
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

const publicDir = resolve(__dirname, "..", "..", "..", "public");
export default function copyPublic(): PluginOption {
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
				copyDirectorySync(publicDir, resolve(outDir, browser.name));
				terminalColorLog(`Public directory copy complete: ${resolve(outDir, browser.name)}`, "success");
			}
		},
		name: "copy-public"
	};
}
