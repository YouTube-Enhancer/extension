import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["home"] },
	id: "hidePosts",
	loadPhase: 2,
	settings: [
		{
			component: "checkbox",
			id: "hidePosts.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePosts.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePosts.enable.title)
		}
	]
});
