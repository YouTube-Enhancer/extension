import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	id: "remainingTime",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "remainingTime.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.remainingTime.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.remainingTime.enable.title)
		}
	]
});
