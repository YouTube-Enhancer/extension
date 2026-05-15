import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

import { PlayerQualityFallbackStrategy, youtubePlayerQualityLevels } from "./types";

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

export const metadata = createFeatureMetadata({
	defaults: { enabled: false, fallbackStrategy: "lower", quality: "hd1080" },
	id: "playerQuality",
	schemaInput: { enabled: z.boolean(), fallbackStrategy: z.enum(PlayerQualityFallbackStrategy), quality: z.enum(youtubePlayerQualityLevels) },
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
					optionsFrom: () => [...youtubePlayerQualityLevels].reverse().map((value) => ({ label: () => qualityLabels[value] ?? value, value })),
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
				}
			],
			section: "playerQuality",
			type: "group"
		}
	]
});
