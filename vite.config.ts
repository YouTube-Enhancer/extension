import react from "@vitejs/plugin-react-swc";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";

import { type AvailableLocales, availableLocales } from "./src/i18n";
import { outputFolderName } from "./src/utils/constants";
import buildContentScript from "./src/utils/plugins/build-content-script";
import copyBuild from "./src/utils/plugins/copy-build";
import copyPublic from "./src/utils/plugins/copy-public";
import makeManifest from "./src/utils/plugins/make-manifest";
import makeReleaseZips from "./src/utils/plugins/make-release-zips";

const root = resolve(__dirname, "src");
const pagesDir = resolve(root, "pages");
const assetsDir = resolve(root, "assets");
const componentsDir = resolve(root, "components");
const utilsDir = resolve(root, "utils");
const hooksDir = resolve(root, "hooks");
const outDir = resolve(__dirname, outputFolderName);
const publicDir = resolve(__dirname, "public");
const i18nDir = resolve(__dirname, "src", "i18n");
type TranslationValue = { [key: string]: TranslationValue } | string;

type TranslationFile = {
	[key: string]: TranslationValue;
};
const emptyOutputFolder = () => {
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
function flattenTranslationValues(translationFile: TranslationFile): string[] {
	let values: string[] = [];

	for (const key in translationFile) {
		if (["langCode", "langName"].includes(key)) continue;
		const { [key]: value } = translationFile;

		if (typeof value === "object") {
			values = values.concat(flattenTranslationValues(value as TranslationFile));
		} else {
			values.push(value);
		}
	}

	return values;
}
function getTranslationFile(translation: AvailableLocales): TranslationFile {
	const translationFile = readFileSync(`${publicDir}/locales/${translation}.json`, "utf-8");
	return JSON.parse(translationFile) as TranslationFile;
}
function calculateTranslationPercentages() {
	const englishFile = getTranslationFile("en-US");
	const translationPercentages = new Map<AvailableLocales, number>();

	availableLocales
		.filter((availableLocales) => availableLocales !== "en-US")
		.forEach((translation) => {
			const translationFile = getTranslationFile(translation);
			const translationPercentage = calculateTranslationPercentage(englishFile, translationFile);
			translationPercentages.set(translation, translationPercentage);
		});
	translationPercentages.set("en-US", 100);
	return translationPercentages;
}
function calculateTranslationPercentage(englishFile: TranslationFile, translationFile: TranslationFile): number {
	const englishValues = flattenTranslationValues(englishFile);
	const translationValues = flattenTranslationValues(translationFile);
	const differingValues = englishValues.filter((value, index) => value !== translationValues[index]);

	const translationPercentage = (differingValues.length / englishValues.length) * 100;

	return Math.floor(translationPercentage);
}
function updateTranslationPercentageObject(code: string, updatedObject: Record<string, number>) {
	const match = code.match(/export\s+const\s+translationPercentages\s*:\s*Record<AvailableLocales,\s*number>\s*=\s*({[^}]+});/);

	if (match) {
		const [, oldObjectPart] = match;
		const newObjectPart = JSON.stringify(updatedObject, null, 2);
		return code.replace(oldObjectPart, newObjectPart);
	} else {
		return null;
	}
}
function updateTranslationPercentages() {
	const translationPercentages = calculateTranslationPercentages();
	const translationPercentagesFile = readFileSync(`${i18nDir}/index.ts`, "utf-8");
	const updatedTranslationPercentagesFile = updateTranslationPercentageObject(translationPercentagesFile, Object.fromEntries(translationPercentages));
	if (updatedTranslationPercentagesFile && updatedTranslationPercentagesFile !== translationPercentagesFile) {
		writeFileSync(`${i18nDir}/index.ts`, updatedTranslationPercentagesFile);
	}
}
function updateAvailableLocalesArray(code: string, updatedArray: string[]) {
	const match = code.match(/export\s+const\s+availableLocales\s*=\s*\[([^\]]*)\]\s*as\s*const\s*;/);

	if (match) {
		const [, oldArrayPart] = match;
		const newArrayPart = JSON.stringify(updatedArray, null, 2).replace(/^\[|\]$/g, "");
		return code.replace(oldArrayPart, newArrayPart);
	} else {
		return null;
	}
}
function updateAvailableLocales() {
	const availableLocales = readdirSync(`${publicDir}/locales`)
		.filter((locale) => locale.endsWith(".json"))
		.map((locale) => locale.replace(".json", ""));
	const availableLocalesFile = readFileSync(`${i18nDir}/index.ts`, "utf-8");
	const updatedAvailableLocalesFile = updateAvailableLocalesArray(availableLocalesFile, availableLocales);
	if (updatedAvailableLocalesFile && updatedAvailableLocalesFile !== availableLocalesFile) {
		writeFileSync(`${i18nDir}/index.ts`, updatedAvailableLocalesFile);
	}
}
export default function build() {
	emptyOutputFolder();
	updateAvailableLocales();
	updateTranslationPercentages();
	return defineConfig({
		build: {
			emptyOutDir: false,
			outDir: resolve(outDir, "temp"),
			rollupOptions: {
				input: {
					background: resolve(pagesDir, "background", "index.ts"),
					options: resolve(pagesDir, "options", "index.html"),
					popup: resolve(pagesDir, "popup", "index.html")
				},
				output: {
					entryFileNames: (chunk) => {
						return `src/pages/${chunk.name}/index.js`;
					}
				}
			},
			sourcemap: process.env.__DEV__ === "true" ? "inline" : false
		},
		plugins: [react(), makeManifest(), buildContentScript(), copyPublic(), copyBuild(), makeReleaseZips()],
		resolve: {
			alias: {
				"@/assets": assetsDir,
				"@/components": componentsDir,
				"@/hooks": hooksDir,
				"@/pages": pagesDir,
				"@/src": root,
				"@/utils": utilsDir
			}
		}
	});
}
