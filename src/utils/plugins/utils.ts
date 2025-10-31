import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "fs";
import { GetInstalledBrowsers } from "get-installed-browsers";
import { join, resolve } from "path";

import type { AvailableLocales } from "@/src/i18n/constants";

import { outputFolderName } from "../../../src/utils/constants";
export type LocaleFile = {
	[key: string]: LocaleValue;
};
export type LocaleValue = string | { [key: string]: LocaleValue };
export const rootDir = resolve(__dirname, "../../../");
export const srcDir = resolve(rootDir, "src");
export const outDir = resolve(rootDir, outputFolderName);
export const publicDir = resolve(rootDir, "public");
export const pagesDir = resolve(srcDir, "pages");
export const assetsDir = resolve(srcDir, "assets");
export const componentsDir = resolve(srcDir, "components");
export const utilsDir = resolve(srcDir, "utils");
export const hooksDir = resolve(srcDir, "hooks");
export const i18nDir = resolve(srcDir, "i18n");

export const browsers = GetInstalledBrowsers();
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

export const emptyOutputFolder = () => {
	if (!existsSync(outDir)) return;
	const files = readdirSync(outDir);
	for (const file of files) {
		if (file.endsWith(".zip")) continue;
		const filePath = resolve(outDir, file);
		const fileStat = statSync(filePath);
		if (fileStat.isDirectory()) {
			rmSync(filePath, { force: true, recursive: true });
		} else {
			rmSync(filePath, { force: true });
		}
	}
};
export function flattenLocaleValues(localeFile: LocaleFile, parentKey = ""): { keys: string[]; values: string[] } {
	let values: string[] = [];
	let keys: string[] = [];
	for (const key in localeFile) {
		if (["langCode", "langName"].includes(key)) continue;
		const { [key]: value } = localeFile;

		const currentKey = parentKey ? `${parentKey}.${key}` : key;

		if (typeof value === "object") {
			const { keys: nestedKeys, values: nestedValues } = flattenLocaleValues(value, currentKey);
			values = values.concat(nestedValues);
			keys = keys.concat(nestedKeys);
		} else {
			values.push(value);
			keys.push(currentKey);
		}
	}

	return { keys, values };
}
export function getLocaleFile(locale: AvailableLocales): LocaleFile {
	const localeFile = readFileSync(`${publicDir}/locales/${locale}.json`, "utf-8");
	return JSON.parse(localeFile) as LocaleFile;
}
