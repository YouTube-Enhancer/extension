import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	defaults: {
		button: {
			enabled: false,
			fullscreenPlacement: "player_controls_right",
			placement: "below_player"
		}
	},
	id: "miniPlayerButton",
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
			id: "miniPlayerButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miniPlayer.button.label),
			section: "miniPlayer",
			title: (t) => t((tr) => tr.settings.sections.miniPlayer.button.title)
		}
	]
});
