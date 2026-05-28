import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["watch"] },
	id: "timestampPeek",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "timestampPeek.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.timestampPeek.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.timestampPeek.enable.title)
		}
	]
});
