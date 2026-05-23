import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["home"] },
	id: "hidePlaylistRecommendationsFromHomePage",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "hidePlaylistRecommendationsFromHomePage.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePlaylistRecommendationsFromHomePage.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hidePlaylistRecommendationsFromHomePage.enable.title)
		}
	]
});
