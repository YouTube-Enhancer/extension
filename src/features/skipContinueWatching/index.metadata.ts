import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	id: "skipContinueWatching",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "skipContinueWatching.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.skipContinueWatching.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.skipContinueWatching.enable.title)
		}
	]
});
