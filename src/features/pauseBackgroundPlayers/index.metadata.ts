import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	id: "pauseBackgroundPlayers",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			id: "pauseBackgroundPlayers.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.pauseBackgroundPlayers.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.pauseBackgroundPlayers.enable.title)
		}
	]
});
