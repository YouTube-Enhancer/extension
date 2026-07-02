import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false), videosPerRow: field(z.number(), 4) },
	id: "videosPerRow",
	sectionTitle: (t) => t((tr) => tr.settings.sections.videosPerRow.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "videosPerRow.enabled",
					label: (t) => t((tr) => tr.settings.sections.videosPerRow.enable.label),
					title: (t) => t((tr) => tr.settings.sections.videosPerRow.enable.title)
				},
				{
					component: "number",
					disabledWhen: [{ equals: false, setting: "videosPerRow.enabled" }],
					id: "videosPerRow.videosPerRow",
					label: (t) => t((tr) => tr.settings.sections.videosPerRow.settings.count.label),
					max: 16,
					min: 1,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.videosPerRow.enable.label
					},
					step: 1,
					title: (t) => t((tr) => tr.settings.sections.videosPerRow.settings.count.title)
				}
			],
			section: "videosPerRow",
			type: "group"
		}
	]
});
