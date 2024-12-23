import type EnUS from "public/locales/en-US.json";

import { availableLocales } from "../i18n/constants";
import { type LocaleFile, flattenLocaleValues, getLocaleFile } from "./plugins/utils";
function checkForMissingKeys(englishFile: LocaleFile, localeFile: LocaleFile) {
	const { keys: englishKeys } = flattenLocaleValues(englishFile);
	const { keys: localeKeys } = flattenLocaleValues(localeFile);
	if (englishKeys.length !== localeKeys.length) {
		const missingKeys = englishKeys.filter((key) => !localeKeys.includes(key));
		const message = `${(localeFile as unknown as EnUS)["langCode"]} is missing ${missingKeys.length} keys\nMissing keys:\n${missingKeys.join(", ")}`;
		return message;
	}
	return false;
}
export default function checkLocalesForMissingKeys() {
	const englishFile = getLocaleFile("en-US");
	const missingKeys = availableLocales
		.filter((availableLocales) => availableLocales !== "en-US")
		.map((locale) => {
			const localeFile = getLocaleFile(locale);
			return checkForMissingKeys(englishFile, localeFile);
		})
		.filter(Boolean);
	if (missingKeys.length) {
		throw new Error(missingKeys.join("\n\n"));
	}
}
