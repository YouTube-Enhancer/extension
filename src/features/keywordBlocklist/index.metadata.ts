import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false), keywords: field(z.string(), "") },
	id: "keywordBlocklist",
	sectionTitle: (t) => t((tr) => tr.settings.sections.keywordBlocklist.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "keywordBlocklist.enabled",
					label: (t) => t((tr) => tr.settings.sections.keywordBlocklist.enable.label),
					title: (t) => t((tr) => tr.settings.sections.keywordBlocklist.enable.title)
				},
				{
					addLabel: (t) => t((tr) => tr.settings.sections.keywordBlocklist.settings.keywords.add),
					component: "string-list",
					disabledWhen: [{ equals: false, setting: "keywordBlocklist.enabled" }],
					id: "keywordBlocklist.keywords",
					itemLabel: (t) => t((tr) => tr.settings.sections.keywordBlocklist.settings.keywords.item),
					label: (t) => t((tr) => tr.settings.sections.keywordBlocklist.settings.keywords.label),
					max: 100,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.keywordBlocklist.enable.label
					},
					removeLabel: (t) => t((tr) => tr.settings.sections.keywordBlocklist.settings.keywords.remove),
					title: (t) => t((tr) => tr.settings.sections.keywordBlocklist.settings.keywords.title)
				}
			],
			section: "keywordBlocklist",
			type: "group"
		}
	]
});
