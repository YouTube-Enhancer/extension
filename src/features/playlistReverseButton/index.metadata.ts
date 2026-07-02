import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["playlist", "watch"] },
	id: "playlistReverseButton",
	settings: [
		{
			component: "checkbox",
			id: "playlistReverseButton.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.playlistReverseButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.playlistReverseButton.enable.title)
		}
	],
	state: { isReversed: field(z.boolean(), false) }
});
