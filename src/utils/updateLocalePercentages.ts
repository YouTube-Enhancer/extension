import { readFileSync, writeFileSync } from "fs";

import { type AvailableLocales, availableLocales } from "../i18n";
import { type LocaleFile, flattenLocaleValues, getLocaleFile, i18nDir } from "./plugins/utils";
function calculateLocalePercentage(englishFile: LocaleFile, localeFile: LocaleFile): number {
	const { values: englishValues } = flattenLocaleValues(englishFile);
	const { values: localeValues } = flattenLocaleValues(localeFile);
	const differingValues = englishValues.filter((value, index) => value !== localeValues[index]);

	const localePercentage = (differingValues.length / englishValues.length) * 100;

	return Math.floor(localePercentage);
}
function calculateLocalePercentages() {
	const englishFile = getLocaleFile("en-US");
	const localePercentages = new Map<AvailableLocales, number>([["en-US", 100]]);

	availableLocales
		.filter((availableLocales) => availableLocales !== "en-US")
		.forEach((locale) => {
			const localeFile = getLocaleFile(locale);
			const localePercentage = calculateLocalePercentage(englishFile, localeFile);
			localePercentages.set(locale, localePercentage);
		});
	localePercentages.set("en-US", 100);
	return localePercentages;
}
function updateLocalePercentageObject(code: string, updatedObject: Record<string, number>) {
	const match = code.match(/export\s+const\s+localePercentages\s*:\s*Record<AvailableLocales,\s*number>\s*=\s*({[^}]+});/);

	if (match) {
		const [, oldObjectPart] = match;
		const newObjectPart = JSON.stringify(updatedObject, null, 2);
		return code.replace(oldObjectPart, newObjectPart);
	} else {
		return null;
	}
}
export default function updateLocalePercentages() {
	const localePercentages = calculateLocalePercentages();
	const localePercentagesFile = readFileSync(`${i18nDir}/index.ts`, "utf-8");
	const updatedLocalePercentagesFile = updateLocalePercentageObject(localePercentagesFile, Object.fromEntries(localePercentages));
	if (updatedLocalePercentagesFile && updatedLocalePercentagesFile !== localePercentagesFile) {
		writeFileSync(`${i18nDir}/index.ts`, updatedLocalePercentagesFile);
	}
}
