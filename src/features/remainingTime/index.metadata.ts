import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["watch"] },
	id: "remainingTime",
	settings: [
		{
			component: "checkbox",
			id: "remainingTime.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.remainingTime.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.remainingTime.enable.title)
		}
	]
});
