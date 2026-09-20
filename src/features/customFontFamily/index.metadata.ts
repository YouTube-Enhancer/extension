import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: {
		enabled: field(z.boolean(), false),
		fontFamily: field(z.string(), "Arial, sans-serif")
	},
	id: "customFontFamily",
	settings: [
		{
			component: "checkbox",
			id: "customFontFamily.enabled",
			label: (t) => t((tr) => tr.settings.sections.customFontFamily.enable.label),
			title: (t) => t((tr) => tr.settings.sections.customFontFamily.enable.title)
		},
		{
			component: "text-input",
			id: "customFontFamily.fontFamily",
			input_type: "text",
			label: (t) => t((tr) => tr.settings.sections.customFontFamily.fontFamily.label),
			title: (t) => t((tr) => tr.settings.sections.customFontFamily.fontFamily.title)
		}
	]
});
