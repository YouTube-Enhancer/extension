import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["watch", "search", "home"] },
	id: "hideArtificialIntelligenceSummary",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hideArtificialIntelligenceSummary.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.label),
			section: "contentFiltering",
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.title)
		}
	]
});
