import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	config: {
		button: { ...buttonField, placement: field(z.enum(buttonPlacements), "feature_menu") }
	},
	dependencies: { includePages: ["watch"] },
	id: "loopButton",
	settings: [
		{
			component: "checkbox",
			id: "loopButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.loopButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.loopButton.enable.title)
		}
	]
});
