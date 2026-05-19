import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonPlacements, fullscreenPlacements, youtubePlayerSpeedStep } from "@/src/types";

export const metadata = createFeatureMetadata({
	defaults: {
		button: {
			enabled: false,
			fullscreenPlacement: "same",
			placement: "player_controls_left"
		},
		speed: 0.25
	},
	id: "playbackSpeedButtons",
	schemaInput: {
		button: z.object({
			enabled: z.boolean(),
			fullscreenPlacement: z.enum(fullscreenPlacements),
			placement: z.enum(buttonPlacements)
		}),
		speed: z.number()
	},
	settings: [
		{
			component: "checkbox",
			id: "playbackSpeedButtons.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.buttons.label),
			section: "playerSpeed",
			title: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.buttons.title)
		},
		{
			component: "number",
			disabledWhen: [{ equals: false, setting: "playbackSpeedButtons.button.enabled" }],
			id: "playbackSpeedButtons.speed",
			label: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.buttons.select.label),
			max: 1,
			min: youtubePlayerSpeedStep,
			parentSetting: {
				type: "singular",
				value: (tr) => tr.settings.sections.playerSpeed.settings.buttons.label
			},
			section: "playerSpeed",
			step: youtubePlayerSpeedStep,
			title: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.buttons.select.title)
		}
	]
});
