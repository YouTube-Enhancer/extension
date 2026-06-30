import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

import { FpsPreference, PlayerQualityFallbackStrategy, youtubePlayerQualityLevels } from "./types";

const qualityLabels: Record<string, string> = {
	auto: "Auto",
	hd720: "720p",
	hd1080: "1080p",
	hd1440: "1440p",
	hd2160: "2160p",
	hd2880: "2880p",
	highres: "4320p",
	large: "480p",
	medium: "360p",
	small: "240p",
	tiny: "144p"
};
const youtubePlayerQualityLevelsNoAuto = youtubePlayerQualityLevels.filter((q) => q !== "auto");
export const metadata = createFeatureMetadata({
	defaults: { enabled: false, fallbackStrategy: "lower", fpsPreference: "default", preferPremium: false, quality: "hd1080" },
	dependencies: { includePages: ["watch", "shorts", "live"] },
	id: "playerQuality",
	schemaInput: {
		enabled: z.boolean(),
		fallbackStrategy: z.enum(PlayerQualityFallbackStrategy),
		fpsPreference: z.enum(FpsPreference),
		preferPremium: z.boolean(),
		quality: z.enum(youtubePlayerQualityLevels)
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.playerQuality.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "playerQuality.enabled",
					label: (t) => t((tr) => tr.settings.sections.playerQuality.enable.label),
					title: (t) => t((tr) => tr.settings.sections.playerQuality.enable.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "playerQuality.enabled" }],
					id: "playerQuality.quality",
					label: (t) => t((tr) => tr.settings.sections.playerQuality.settings.quality.select.label),
					optionsFrom: () => [...youtubePlayerQualityLevelsNoAuto].reverse().map((value) => ({ label: () => qualityLabels[value] ?? value, value })),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.playerQuality.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.playerQuality.settings.quality.select.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "playerQuality.enabled" }],
					id: "playerQuality.fallbackStrategy",
					label: (t) => t((tr) => tr.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.label),
					optionsFrom: () =>
						PlayerQualityFallbackStrategy.map((value) => ({
							label: (t) => t((tr) => tr.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.options[value]),
							value
						})),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.playerQuality.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "playerQuality.enabled" }],
					id: "playerQuality.fpsPreference",
					label: (t) => t((tr) => tr.settings.sections.playerQuality.settings.fpsPreference.select.label),
					optionsFrom: () =>
						FpsPreference.map((value) => ({
							label: (t) => t((tr) => tr.settings.sections.playerQuality.settings.fpsPreference.select.options[value]),
							value
						})),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.playerQuality.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.playerQuality.settings.fpsPreference.select.title)
				},
				{
					component: "checkbox",
					disabledWhen: [{ equals: false, setting: "playerQuality.enabled" }],
					id: "playerQuality.preferPremium",
					label: (t) => t((tr) => tr.settings.sections.playerQuality.settings.preferPremium.label),
					title: (t) => t((tr) => tr.settings.sections.playerQuality.settings.preferPremium.title)
				}
			],
			section: "playerQuality",
			type: "group"
		}
	]
});
