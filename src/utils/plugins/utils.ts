import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { GetInstalledBrowsers } from "get-installed-browsers";
import { join } from "path";

export function copyDirectorySync(sourceDir: string, targetDir: string) {
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
export const browsers = GetInstalledBrowsers();
