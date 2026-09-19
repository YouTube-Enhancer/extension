import { readdirSync, readFileSync } from "fs";

import { i18nDir, publicDir } from "@/src/utils/plugins/utils";
import { writeFormattedFile } from "@/src/utils/plugins/writeFormattedFile";
export default async function updateAvailableLocales(): Promise<void> {
	const availableLocales = readdirSync(`${publicDir}/locales`)
		.filter((locale) => locale.endsWith(".json"))
		.map((locale) => locale.replace(".json", ""))
		.sort();
	const availableLocalesFile = readFileSync(`${i18nDir}/constants.ts`, "utf-8");
	const updatedAvailableLocalesFile = updateAvailableLocalesArray(availableLocalesFile, availableLocales);
	if (updatedAvailableLocalesFile && updatedAvailableLocalesFile !== availableLocalesFile) {
		await writeFormattedFile(`${i18nDir}/constants.ts`, updatedAvailableLocalesFile);
	}
}

function updateAvailableLocalesArray(code: string, updatedArray: string[]) {
	const match = code.match(/export\s+const\s+availableLocales\s*=\s*\[([^\]]*)\]\s*as\s*const\s*;/);
	if (match) {
		const [, oldArrayPart] = match;
		const newArrayPart = JSON.stringify(updatedArray, null, "\t").replace(/^\[|\]$/g, "");
		return code.replace(oldArrayPart, newArrayPart);
	} else {
		return null;
	}
}
