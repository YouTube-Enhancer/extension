import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["watch"] },
	id: "hideArtificialIntelligenceSummary",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hideArtificialIntelligenceSummary.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.title)
		}
	]
});
