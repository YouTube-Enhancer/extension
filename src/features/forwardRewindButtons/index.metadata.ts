import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	defaults: { button: { enabled: false, fullscreenPlacement: "same", placement: "player_controls_right" }, time: 5 },
	id: "forwardRewindButtons",
	schemaInput: {
		button: z.object({
			enabled: z.boolean(),
			fullscreenPlacement: z.enum(fullscreenPlacements),
			placement: z.enum(buttonPlacements)
		}),
		time: z.number()
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.forwardRewindButtons.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "forwardRewindButtons.button.enabled",
					label: (t) => t((tr) => tr.settings.sections.forwardRewindButtons.enable.label),
					title: (t) => t((tr) => tr.settings.sections.forwardRewindButtons.enable.title)
				},
				{
					component: "number",
					disabledWhen: [{ equals: false, setting: "forwardRewindButtons.button.enabled" }],
					id: "forwardRewindButtons.time",
					label: (t) => t((tr) => tr.settings.sections.forwardRewindButtons.settings.time.label),
					max: 30,
					min: 1,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.forwardRewindButtons.enable.label
					},
					step: 1,
					title: (t) => t((tr) => tr.settings.sections.forwardRewindButtons.settings.time.title)
				}
			],
			section: "forwardRewindButtons",
			type: "group"
		}
	]
});
