import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	button: "monoToStereoButton",
	config: { button: { ...buttonField, placement: field(z.enum(buttonPlacements), "player_controls_left") } },
	dependencies: { includePages: ["watch", "live"] },
	id: "monoToStereoButton",
	settings: [
		{
			component: "checkbox",
			id: "monoToStereoButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.monoToStereoButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.monoToStereoButton.enable.title)
		}
	]
});
