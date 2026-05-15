import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		enabled: false
	},
	id: "automaticTheaterMode",
	schemaInput: {
		enabled: z.boolean()
	},
	settings: [
		{
			component: "checkbox",
			id: "automaticTheaterMode.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticTheaterMode.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticTheaterMode.enable.title)
		}
	]
});
