import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "fs";
import { GetInstalledBrowsers } from "get-installed-browsers";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

import type { AvailableLocales } from "@/src/i18n/constants";

/**
 * vite.config.ts imports this module, and Vite's config loader leaves the `@/src` alias for Node to resolve, which
 * it cannot. A relative path is the only form that loads there; the type-only import above is erased first.
 */
import { outputFolderName } from "../constants.ts";
export type LocaleFile = {
	[key: string]: LocaleValue;
};
export type LocaleValue = string | { [key: string]: LocaleValue };
type Browser = ReturnType<typeof GetInstalledBrowsers>[number];
const getDirname = () => {
	if (typeof import.meta !== "undefined" && import.meta.url) {
		return dirname(fileURLToPath(import.meta.url));
	}
	return dirname(require.main?.filename ?? process.cwd());
};

export const rootDir = resolve(getDirname(), "../../../");
export const srcDir = resolve(rootDir, "src");
export const outDir = resolve(rootDir, outputFolderName);
export const publicDir = resolve(rootDir, "public");
export const pagesDir = resolve(srcDir, "pages");
export const assetsDir = resolve(srcDir, "assets");
export const componentsDir = resolve(srcDir, "components");
export const utilsDir = resolve(srcDir, "utils");
export const hooksDir = resolve(srcDir, "hooks");
export const i18nDir = resolve(srcDir, "i18n");

/**
 * One output target per manifest flavour. The extension ships two manifests, Chromium and Firefox, but a copy and a
 * release ZIP used to be made for every installed browser (Edge, Firefox Developer Edition, and on Windows even "IE"),
 * which multiplied the copy and ZIP time without producing anything different. Chrome and Firefox are the preferred
 * names, so the folders a developer loads from stay `dist/Chrome` and `dist/Firefox`; CI has no browsers installed and
 * gets the same two.
 */
function pickBuildTargets(installed: Browser[]): Browser[] {
	const targets: Browser[] = [];
	for (const type of ["chrome", "firefox"] as const) {
		const preferredName = type === "chrome" ? "Chrome" : "Firefox";
		const candidates = installed.filter((browser) => browser.type === type);
		targets.push(candidates.find((browser) => browser.name === preferredName) ?? candidates[0] ?? { name: preferredName, path: "", type });
	}
	return targets;
}
export const browsers = pickBuildTargets(GetInstalledBrowsers());
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

/**
 * Clears everything in the output folder, `temp` included: `copyOutputs` copies whatever `temp` holds, so files left
 * there by an interrupted or manual build (development devtools pages in a production build, for example) would
 * otherwise end up in the packaged output.
 */
export const emptyOutputFolder = () => {
	if (!existsSync(outDir)) return;
	for (const file of readdirSync(outDir)) {
		rmSync(resolve(outDir, file), { force: true, recursive: true });
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
