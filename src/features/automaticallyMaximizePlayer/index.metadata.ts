import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		enabled: false
	},
	dependencies: { includePages: ["watch", "live"] },
	id: "automaticallyMaximizePlayer",
	schemaInput: {
		enabled: z.boolean()
	},
	settings: [
		{
			component: "checkbox",
			id: "automaticallyMaximizePlayer.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyMaximizePlayer.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyMaximizePlayer.enable.title)
		}
	]
});
