import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { code: field(z.string(), ""), enabled: field(z.boolean(), false) },
	id: "customCSS",
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
