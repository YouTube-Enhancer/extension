import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["home"] },
	id: "hideOfficialArtistVideosFromHomePage",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hideOfficialArtistVideosFromHomePage.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideOfficialArtistVideosFromHomePage.enable.label),
			section: "contentFiltering",
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideOfficialArtistVideosFromHomePage.enable.title)
		}
	]
});
