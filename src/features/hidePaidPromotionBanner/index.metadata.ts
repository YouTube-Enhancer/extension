import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["watch"] },
	id: "hidePaidPromotionBanner",
	settings: [
		{
			component: "checkbox",
			id: "hidePaidPromotionBanner.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.title)
		}
	]
});
