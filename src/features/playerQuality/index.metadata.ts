import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

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
	config: {
		enabled: field(z.boolean(), false),
		fallbackStrategy: field(z.enum(PlayerQualityFallbackStrategy), "lower"),
		fpsPreference: field(z.enum(FpsPreference), "default"),
		preferPremium: field(z.boolean(), false),
		quality: field(z.enum(youtubePlayerQualityLevels), "hd1080")
	},
	dependencies: { includePages: ["watch", "shorts", "live"] },
	id: "playerQuality",
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
