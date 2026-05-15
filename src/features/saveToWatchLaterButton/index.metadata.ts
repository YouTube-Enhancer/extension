import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	id: "saveToWatchLaterButton",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "saveToWatchLaterButton.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.title)
		}
	]
});
