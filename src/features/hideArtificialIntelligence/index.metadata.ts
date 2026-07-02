import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	id: "hideArtificialIntelligence",
	settings: [
		{
			component: "checkbox",
			id: "hideArtificialIntelligence.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideArtificialIntelligence.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideArtificialIntelligence.enable.title)
		}
	]
});
