import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	defaults: {
		button: {
			enabled: false,
			fullscreenPlacement: "same",
			placement: "player_controls_left"
		}
	},
	dependencies: { includePages: ["watch", "live"] },
	id: "monoToStereoButton",
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
			id: "monoToStereoButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.monoToStereoButton.enable.label),
			section: "playbackControls",
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.monoToStereoButton.enable.title)
		}
	]
});
