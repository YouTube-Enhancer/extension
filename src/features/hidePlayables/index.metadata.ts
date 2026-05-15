import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	id: "hidePlayables",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hidePlayables.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePlayables.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePlayables.enable.title)
		}
	]
});
