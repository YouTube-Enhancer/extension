import { readdirSync, readFileSync, writeFileSync } from "fs";

import { i18nDir, publicDir } from "./plugins/utils";
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

export default function updateAvailableLocales() {
	const availableLocales = readdirSync(`${publicDir}/locales`)
		.filter((locale) => locale.endsWith(".json"))
		.map((locale) => locale.replace(".json", ""));
	const availableLocalesFile = readFileSync(`${i18nDir}/constants.ts`, "utf-8");
	const updatedAvailableLocalesFile = updateAvailableLocalesArray(availableLocalesFile, availableLocales);
	if (updatedAvailableLocalesFile && updatedAvailableLocalesFile !== availableLocalesFile) {
		writeFileSync(`${i18nDir}/constants.ts`, updatedAvailableLocalesFile);
	}
}
