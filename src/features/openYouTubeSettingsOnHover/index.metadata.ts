import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["watch", "live"] },
	id: "openYouTubeSettingsOnHover",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "openYouTubeSettingsOnHover.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.openYouTubeSettingsOnHover.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.openYouTubeSettingsOnHover.enable.title)
		}
	]
});
