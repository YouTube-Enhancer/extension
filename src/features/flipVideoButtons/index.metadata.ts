import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	defaults: {
		buttons: {
			flipVideoHorizontalButton: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "player_controls_right"
			},
			flipVideoVerticalButton: {
				enabled: false,
				fullscreenPlacement: "same",
				placement: "player_controls_right"
			}
		}
	},
	id: "flipVideoButtons",
	schemaInput: {
		buttons: z.object({
			flipVideoHorizontalButton: z.object({
				enabled: z.boolean(),
				fullscreenPlacement: z.enum(fullscreenPlacements),
				placement: z.enum(buttonPlacements)
			}),
			flipVideoVerticalButton: z.object({
				enabled: z.boolean(),
				fullscreenPlacement: z.enum(fullscreenPlacements),
				placement: z.enum(buttonPlacements)
			})
		})
	},
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
