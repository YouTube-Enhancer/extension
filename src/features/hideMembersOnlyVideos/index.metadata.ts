import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	id: "hideMembersOnlyVideos",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hideMembersOnlyVideos.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideMembersOnlyVideos.enable.label),
			section: "contentFiltering",
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideMembersOnlyVideos.enable.title)
		}
	]
});
