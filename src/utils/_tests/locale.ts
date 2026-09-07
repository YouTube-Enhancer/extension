import { readFileSync } from "fs";

import type EnUS from "@/public/locales/en-US.json.d";
import type { TFunction } from "@/src/pipeline/utils";
import type { Path } from "@/src/types";

/** A dotted path into a locale file, checked against the shipped en-US typings. */
export type LocalePath = Path<EnUS>;

const localeCache = new Map<string, Record<string, unknown>>();

/**
 * The selector-style translate function the feature metadata takes (`(t) => t((tr) => tr.settings...)`), answered
 * from a locale file, so a test can ask the metadata for its own labels instead of copying them.
 */
export function localeSelector(locale = "en-US"): TFunction {
	const translations = readLocale(locale) as unknown as EnUS;
	return ((selector: (translations: EnUS) => string) => selector(translations)) as unknown as TFunction;
}

/** The string at `path` in a locale file, the same one the UI renders from, so a reworded label cannot pass a stale test. */
export function localeText(path: LocalePath, locale = "en-US"): string {
	return translate(readLocale(locale), path);
}

/** Loads a shipped locale file once. */
export function readLocale(locale = "en-US"): Record<string, unknown> {
	let parsed = localeCache.get(locale);
	if (!parsed) {
		parsed = JSON.parse(readFileSync(`public/locales/${locale}.json`, "utf8")) as Record<string, unknown>;
		localeCache.set(locale, parsed);
	}
	return parsed;
}

export function translate(locale: Record<string, unknown>, path: string): string {
	const value = path.split(".").reduce<unknown>((accumulator, key) => (accumulator as Record<string, unknown> | undefined)?.[key], locale);
	if (typeof value !== "string") throw new Error(`Missing locale string for "${path}"`);
	return value;
}
