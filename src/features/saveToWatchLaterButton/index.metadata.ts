import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["home", "subscriptions"] },
	id: "saveToWatchLaterButton",
	settings: [
		{
			component: "checkbox",
			id: "saveToWatchLaterButton.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.title)
		}
	]
});
