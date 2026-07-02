import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["live"] },
	id: "hideLiveStreamChat",
	settings: [
		{
			component: "checkbox",
			id: "hideLiveStreamChat.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideLiveStreamChat.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideLiveStreamChat.enable.title)
		}
	]
});
