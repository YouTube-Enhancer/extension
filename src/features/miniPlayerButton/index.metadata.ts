import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	config: {
		button: {
			...buttonField,
			fullscreenPlacement: field(z.enum(fullscreenPlacements), "player_controls_right"),
			placement: field(z.enum(buttonPlacements), "below_player")
		}
	},
	dependencies: { includePages: ["watch", "live"] },
	id: "miniPlayerButton",
	settings: [
		{
			component: "checkbox",
			id: "miniPlayerButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miniPlayer.button.label),
			section: "miniPlayer",
			title: (t) => t((tr) => tr.settings.sections.miniPlayer.button.title)
		}
	]
});
