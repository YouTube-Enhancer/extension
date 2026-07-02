import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	button: "hideEndScreenCardsButton",
	config: { button: { ...buttonField, placement: field(z.enum(buttonPlacements), "player_controls_right") } },
	dependencies: { includePages: ["watch"] },
	id: "hideEndScreenCardsButton",
	settings: [
		{
			component: "checkbox",
			id: "hideEndScreenCardsButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideEndScreenCardsButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.hideEndScreenCardsButton.enable.title)
		}
	]
});
