import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	button: "copyTimestampUrlButton",
	config: { button: { ...buttonField, placement: field(z.enum(buttonPlacements), "player_controls_right") } },
	dependencies: { includePages: ["watch"] },
	id: "copyTimestampUrlButton",
	settings: [
		{
			component: "checkbox",
			id: "copyTimestampUrlButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.copyTimestampUrlButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.copyTimestampUrlButton.enable.title)
		}
	]
});
