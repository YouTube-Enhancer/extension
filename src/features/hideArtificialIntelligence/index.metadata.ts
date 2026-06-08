import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["watch", "search", "home"] },
	id: "hideArtificialIntelligence",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hideArtificialIntelligence.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideArtificialIntelligence.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideArtificialIntelligence.enable.title)
		}
	]
});
