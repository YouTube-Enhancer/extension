import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false), volume: field(z.number(), 25) },
	dependencies: { includePages: ["watch", "live", "shorts"] },
	id: "globalVolume",
	sectionTitle: (t) => t((tr) => tr.settings.sections.globalVolume.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					disabledReason: (t) => t((tr) => tr.pages.options.extras.optionDisabled.specificOption.globalVolume),
					disabledWhen: [{ equals: true, feature: "rememberVolume", setting: "rememberVolume.enabled" }],
					id: "globalVolume.enabled",
					label: (t) => t((tr) => tr.settings.sections.globalVolume.enable.label),
					title: (t) => t((tr) => tr.settings.sections.globalVolume.enable.title)
				},
				{
					component: "number",
					disabledWhen: [
						{ equals: true, feature: "rememberVolume", setting: "rememberVolume.enabled" },
						{
							equals: false,
							setting: "globalVolume.enabled"
						}
					],
					id: "globalVolume.volume",
					label: (t) => t((tr) => tr.settings.sections.globalVolume.settings.amount.label),
					max: 100,
					min: 1,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.globalVolume.enable.label
					},
					step: 1,
					title: (t) => t((tr) => tr.settings.sections.globalVolume.settings.amount.title)
				}
			],
			section: "globalVolume",
			type: "group"
		}
	]
});
