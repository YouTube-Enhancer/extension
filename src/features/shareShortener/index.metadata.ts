import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	id: "shareShortener",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "shareShortener.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.shareShortener.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.shareShortener.enable.title)
		}
	]
});
