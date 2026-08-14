import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	defaults: {
		button: {
			enabled: false,
			fullscreenPlacement: "same",
			placement: "player_controls_left"
		},
		resetToPlayerSpeed: false
	},
	dependencies: { includePages: ["watch"] },
	id: "resetPlaybackSpeedButton",
	schemaInput: {
		button: z.object({
			enabled: z.boolean(),
			fullscreenPlacement: z.enum(fullscreenPlacements),
			placement: z.enum(buttonPlacements)
		}),
		resetToPlayerSpeed: z.boolean()
	},
	settings: [
		{
			component: "checkbox",
			id: "resetPlaybackSpeedButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.resetPlaybackSpeedButton.enable.label),
			section: "playerSpeed",
			title: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.resetPlaybackSpeedButton.enable.title)
		},
		{
			component: "checkbox",
			disabledWhen: [{ equals: false, setting: "resetPlaybackSpeedButton.button.enabled" }],
			id: "resetPlaybackSpeedButton.resetToPlayerSpeed",
			label: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.resetPlaybackSpeedButton.resetToPlayerSpeed.label),
			parentSetting: {
				type: "singular",
				value: (tr) => tr.settings.sections.playerSpeed.settings.resetPlaybackSpeedButton.enable.label
			},
			section: "playerSpeed",
			title: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.resetPlaybackSpeedButton.resetToPlayerSpeed.title)
		}
	]
});
