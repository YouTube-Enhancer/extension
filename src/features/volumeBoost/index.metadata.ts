import { z } from "zod/v4-mini";

import type { SnakeToCamel } from "@/src/types";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { volumeBoostModes } from "@/src/features/volumeBoost/types";
import { buttonPlacements } from "@/src/types";

type ModeKeys = SnakeToCamel<(typeof volumeBoostModes)[number]>;

const modeKeys: ModeKeys[] = volumeBoostModes.map((value) => value.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()) as ModeKeys);

export const metadata = createFeatureMetadata({
	config: {
		amount: field(z.number(), 5),
		button: {
			fullscreenPlacement: buttonField.fullscreenPlacement,
			placement: field(z.enum(buttonPlacements), "player_controls_left")
		},
		enabled: field(z.boolean(), false),
		mode: field(z.enum(volumeBoostModes), "global")
	},
	dependencies: { includePages: ["watch", "live", "shorts"] },
	id: "volumeBoost",
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
