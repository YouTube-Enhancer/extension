import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	button: "resetPlaybackSpeedButton",
	config: {
		button: { ...buttonField, placement: field(z.enum(buttonPlacements), "player_controls_left") },
		resetToPlayerSpeed: field(z.boolean(), false)
	},
	dependencies: { includePages: ["watch"] },
	id: "resetPlaybackSpeedButton",
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
