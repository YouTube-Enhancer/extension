import { readFileSync, writeFileSync } from "fs";
import { z } from "zod";
import { generateErrorMessage } from "zod-error";

import type { CrowdinLanguageProgressResponse, TypeToZodSchema } from "../types";

import { type AvailableLocales } from "../i18n/constants";
import { i18nDir } from "./plugins/utils";
import { formatError } from "./utilities";

const crowdinLanguageProgressResponseSchema: TypeToZodSchema<CrowdinLanguageProgressResponse> = z.object({
	data: z.array(
		z.object({
			data: z.object({
				approvalProgress: z.number(),
				language: z.object({
					androidCode: z.string(),
					dialectOf: z.string().nullable(),
					editorCode: z.string(),
					id: z.string(),
					locale: z.string(),
					name: z.string(),
					osxCode: z.string(),
					osxLocale: z.string(),
					pluralCategoryNames: z.array(z.string()),
					pluralExamples: z.array(z.string()),
					pluralRules: z.string(),
					textDirection: z.string(),
					threeLettersCode: z.string(),
					twoLettersCode: z.string()
				}),
				languageId: z.string(),
				phrases: z.object({
					approved: z.number(),
					preTranslateAppliedTo: z.number(),
					total: z.number(),
					translated: z.number()
				}),
				translationProgress: z.number(),
				words: z.object({
					approved: z.number(),
					preTranslateAppliedTo: z.number(),
					total: z.number(),
					translated: z.number()
				})
			})
		})
	),
	pagination: z.object({
		limit: z.number(),
		offset: z.number()
	})
});

export default async function updateLocalePercentages() {
	const localePercentages = await getLocalePercentagesFromCrowdin();
	if (!localePercentages) return;
	const localePercentagesFile = readFileSync(`${i18nDir}/constants.ts`, "utf-8");
	const updatedLocalePercentagesFile = updateLocalePercentageObject(localePercentagesFile, Object.fromEntries(localePercentages));
	if (updatedLocalePercentagesFile && updatedLocalePercentagesFile !== localePercentagesFile) {
		writeFileSync(`${i18nDir}/constants.ts`, updatedLocalePercentagesFile);
	}
}
async function getLocalePercentagesFromCrowdin() {
	if (!process.env.CROWDIN_TOKEN) return;
	try {
		const response = await fetch("https://crowdin.com/api/v2/projects/627048/languages/progress", {
			headers: { Authorization: "Bearer " + process.env.CROWDIN_TOKEN },
			method: "get"
		});
		const data = await response.text();
		const json = JSON.parse(data);
		const crowdinLanguageProgressResponseParsed = crowdinLanguageProgressResponseSchema.safeParse(json);
		if (crowdinLanguageProgressResponseParsed.success) {
			const { data } = json as CrowdinLanguageProgressResponse;
			const localePercentages = new Map<AvailableLocales, number>([
				["en-US", 100],
				...data.map(
					({
						data: {
							approvalProgress,
							language: { locale }
						}
					}) => [locale as AvailableLocales, approvalProgress] as [AvailableLocales, number]
				)
			]);
			return localePercentages;
		} else if (!crowdinLanguageProgressResponseParsed.success) {
			const { error } = crowdinLanguageProgressResponseParsed;
			throw new Error(`Failed to get locale percentages from Crowdin\n\n${generateErrorMessage(error.errors)}`);
		}
	} catch (error) {
		throw new Error(formatError(error));
	}
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
