import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["watch"] },
	id: "hideTranslateComment",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hideTranslateComment.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideTranslateComment.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideTranslateComment.enable.title)
		}
	]
});
