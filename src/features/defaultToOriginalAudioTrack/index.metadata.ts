import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		enabled: false
	},
	dependencies: { includePages: ["watch", "shorts"] },
	id: "defaultToOriginalAudioTrack",
	schemaInput: {
		enabled: z.boolean()
	},
	settings: [
		{
			component: "checkbox",
			id: "defaultToOriginalAudioTrack.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.title)
		}
	]
});
