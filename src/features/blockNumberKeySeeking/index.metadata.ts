import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		enabled: false
	},
	dependencies: { includePages: ["watch", "live"] },
	id: "blockNumberKeySeeking",
	schemaInput: {
		enabled: z.boolean()
	},
	settings: [
		{
			component: "checkbox",
			id: "blockNumberKeySeeking.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.blockNumberKeySeeking.enable.label),
			section: "playbackControls",
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.blockNumberKeySeeking.enable.title)
		}
	]
});
