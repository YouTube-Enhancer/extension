import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: {
		enabled: field(z.boolean(), false),
		jumpBy: field(
			z.number().check(z.refine((value) => Number.isInteger(value) && value >= 5 && value <= 60)),
			10
		)
	},
	dependencies: { includePages: ["watch"] },
	id: "customSeekDuration",
	loadPhase: 1,
	sectionTitle: (t) => t((tr) => tr.settings.sections.customSeekDuration.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "customSeekDuration.enabled",
					label: (t) => t((tr) => tr.settings.sections.customSeekDuration.enable.label),
					title: (t) => t((tr) => tr.settings.sections.customSeekDuration.enable.title)
				},
				{
					component: "number",
					disabledWhen: [{ equals: false, setting: "customSeekDuration.enabled" }],
					id: "customSeekDuration.jumpBy",
					label: (t) => t((tr) => tr.settings.sections.customSeekDuration.jumpBy.label),
					max: 60,
					min: 5,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.customSeekDuration.enable.label
					},
					step: 1,
					title: (t) => t((tr) => tr.settings.sections.customSeekDuration.jumpBy.title)
				}
			],
			section: "customSeekDuration",
			type: "group"
		}
	]
});
