import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	id: "hidePaidPromotionBanner",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hidePaidPromotionBanner.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.title)
		}
	]
});
