import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["playlist", "watch"] },
	id: "playlistReverseButton",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "playlistReverseButton.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.playlistReverseButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.playlistReverseButton.enable.title)
		}
	],
	stateSchemaInput: { isReversed: z.boolean() }
});
