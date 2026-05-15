import type { i18nInstanceType } from "@/src/i18n";

export type TFunction = i18nInstanceType["t"];

export type TranslationRoot = {
	settings?: {
		sections?: Record<string, unknown>;
	};
};
export function createT(translations: TranslationRoot): TFunction {
	return function <T>(selector: (tr: TranslationRoot) => T, opts?: Record<string, unknown>): T {
		const result = selector(translations ?? {});
		if (typeof result === "string" && opts) {
			// eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/no-unsafe-member-access
			return result.replace(/\{\{(\w+)\}\}/g, (_, key) => String(opts[key] ?? `{{${key}}}`)) as T;
		}
		return result;
	} as TFunction;
}

export function safeResolve(fn: unknown, t: TFunction, opts?: Record<string, unknown>): string {
	if (typeof fn !== "function") return "";
	try {
		const result = opts ? (fn as (t: TFunction, opts: Record<string, unknown>) => unknown)(t, opts) : (fn as (t: TFunction) => unknown)(t);
		return typeof result === "string" ? result : "";
	} catch {
		return "";
	}
}
