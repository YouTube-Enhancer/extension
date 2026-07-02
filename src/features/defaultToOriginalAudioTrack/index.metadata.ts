import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["watch", "shorts"] },
	id: "defaultToOriginalAudioTrack",
	settings: [
		{
			component: "checkbox",
			id: "defaultToOriginalAudioTrack.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.title)
		}
	]
});
