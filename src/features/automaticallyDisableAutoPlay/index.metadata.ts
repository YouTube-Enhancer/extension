import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		enabled: false
	},
	dependencies: { includePages: ["watch"] },
	id: "automaticallyDisableAutoPlay",
	schemaInput: {
		enabled: z.boolean()
	},
	settings: [
		{
			component: "checkbox",
			id: "automaticallyDisableAutoPlay.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyDisableAutoPlay.enable.label),
			section: "automaticBehaviors",
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyDisableAutoPlay.enable.title)
		}
	]
});
