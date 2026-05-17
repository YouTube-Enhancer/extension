import { z } from "zod/v4-mini";

import type { SnakeToCamel } from "@/src/types";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { volumeBoostModes } from "@/src/features/volumeBoost/types";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";

type ModeKeys = SnakeToCamel<(typeof volumeBoostModes)[number]>;

const modeKeys: ModeKeys[] = volumeBoostModes.map((value) => value.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()) as ModeKeys);

export const metadata = createFeatureMetadata({
	defaults: {
		amount: 5,
		button: { fullscreenPlacement: "same", placement: "player_controls_left" },
		enabled: false,
		mode: "global"
	},
	id: "volumeBoost",
	schemaInput: {
		amount: z.number(),
		button: z.object({
			fullscreenPlacement: z.enum(fullscreenPlacements),
			placement: z.enum(buttonPlacements)
		}),
		enabled: z.boolean(),
		mode: z.enum(volumeBoostModes)
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.volumeBoost.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "volumeBoost.enabled",
					label: (t) => t((tr) => tr.settings.sections.volumeBoost.enable.label),
					title: (t) => t((tr) => tr.settings.sections.volumeBoost.enable.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "volumeBoost.enabled" }],
					id: "volumeBoost.mode",
					label: (t) => t((tr) => tr.settings.sections.volumeBoost.settings.mode.select.label),
					optionsFrom: () =>
						modeKeys.map((key, index) => ({
							label: (t) => t((tr) => tr.settings.sections.volumeBoost.settings.mode.select.options[key]),
							value: volumeBoostModes[index]
						})),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.volumeBoost.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.volumeBoost.settings.mode.select.title)
				},
				{
					component: "number",
					disabledWhen: [{ equals: false, setting: "volumeBoost.enabled" }],
					id: "volumeBoost.amount",
					label: (t) => t((tr) => tr.settings.sections.volumeBoost.settings.amount.label),
					max: 100,
					min: 1,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.volumeBoost.enable.label
					},
					step: 1,
					title: (t) => t((tr) => tr.settings.sections.volumeBoost.settings.amount.title)
				}
			],
			section: "volumeBoost",
			type: "group"
		}
	]
});
