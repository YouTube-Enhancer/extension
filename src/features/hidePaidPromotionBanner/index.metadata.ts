import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["watch"] },
	id: "hidePaidPromotionBanner",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hidePaidPromotionBanner.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.label),
			section: "contentFiltering",
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.title)
		}
	]
});
