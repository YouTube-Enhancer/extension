import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	config: {
		buttons: {
			flipVideoHorizontalButton: { ...buttonField, placement: field(z.enum(buttonPlacements), "player_controls_right") },
			flipVideoVerticalButton: { ...buttonField, placement: field(z.enum(buttonPlacements), "player_controls_right") }
		}
	},
	dependencies: { includePages: ["watch", "live"] },
	id: "flipVideoButtons",
	settings: [
		{
			component: "checkbox",
			id: "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.flipVideoHorizontalButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.flipVideoHorizontalButton.enable.title)
		},
		{
			component: "checkbox",
			id: "flipVideoButtons.buttons.flipVideoVerticalButton.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.flipVideoVerticalButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.flipVideoVerticalButton.enable.title)
		}
	]
});
