import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";
export const metadata = createFeatureMetadata({
	defaults: {
		button: {
			enabled: false,
			fullscreenPlacement: "same",
			placement: "feature_menu"
		}
	},
	dependencies: { includePages: ["watch"] },
	id: "loopButton",
	schemaInput: {
		button: z.object({
			enabled: z.boolean(),
			fullscreenPlacement: z.enum(fullscreenPlacements),
			placement: z.enum(buttonPlacements)
		})
	},
	settings: [
		{
			component: "checkbox",
			id: "loopButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.loopButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.loopButton.enable.title)
		}
	]
});
