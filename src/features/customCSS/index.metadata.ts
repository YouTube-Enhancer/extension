import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		code: "",
		enabled: false
	},
	id: "customCSS",
	schemaInput: {
		code: z.string(),
		enabled: z.boolean()
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.customCSS.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "customCSS.enabled",
					label: (t) => t((tr) => tr.settings.sections.customCSS.enable.label),
					title: (t) => t((tr) => tr.settings.sections.customCSS.enable.title)
				},
				{
					alwaysVisible: true,
					component: "css-editor",
					disabledWhen: [
						{
							equals: false,
							setting: "customCSS.enabled"
						}
					],
					id: "customCSS.code",
					label: () => "",
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.customCSS.enable.label
					},
					title: () => ""
				}
			],
			section: "customCSS",
			type: "group"
		}
	]
});
