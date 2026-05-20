import { z } from "zod/v4-mini";

import type { SnakeToCamel } from "@/src/types";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { miniPlayerPositions, miniPlayerSizes } from "@/src/features/miniPlayer/types";

type PositionKeys = SnakeToCamel<(typeof miniPlayerPositions)[number]>;

const positionOptions: { key: PositionKeys; value: (typeof miniPlayerPositions)[number] }[] = miniPlayerPositions.map((value) => ({
	key: value.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()) as PositionKeys,
	value
}));

export const metadata = createFeatureMetadata({
	defaults: { defaultPosition: "bottom_right", defaultSize: "400x225", enabled: false },
	id: "miniPlayer",
	schemaInput: { defaultPosition: z.enum(miniPlayerPositions), defaultSize: z.enum(miniPlayerSizes), enabled: z.boolean() },
	sectionTitle: (t) => t((tr) => tr.settings.sections.miniPlayer.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "miniPlayer.enabled",
					label: (t) => t((tr) => tr.settings.sections.miniPlayer.enable.label),
					title: (t) => t((tr) => tr.settings.sections.miniPlayer.enable.title)
				},
				{
					component: "select",
					disabledWhen: [
						{ equals: false, setting: "miniPlayer.enabled" },
						{ equals: false, feature: "miniPlayerButton", setting: "miniPlayerButton.button.enabled" }
					],
					id: "miniPlayer.defaultPosition",
					label: (t) => t((tr) => tr.settings.sections.miniPlayer.settings.position.select.label),
					optionsFrom: () =>
						positionOptions.map(({ key, value }) => ({
							label: (t) => t((tr) => tr.settings.sections.miniPlayer.settings.position.select.options[key]),
							value
						})),
					parentSetting: {
						type: "either",
						value: [(tr) => tr.settings.sections.miniPlayer.enable.label, (tr) => tr.settings.sections.miniPlayer.button.label]
					},
					title: (t) => t((tr) => tr.settings.sections.miniPlayer.settings.position.select.title)
				},
				{
					component: "select",
					disabledWhen: [
						{ equals: false, setting: "miniPlayer.enabled" },
						{ equals: false, feature: "miniPlayerButton", setting: "miniPlayerButton.button.enabled" }
					],
					id: "miniPlayer.defaultSize",
					label: (t) => t((tr) => tr.settings.sections.miniPlayer.settings.size.label),
					optionsFrom: () => miniPlayerSizes.map((value) => ({ label: () => value, value })),
					parentSetting: {
						type: "either",
						value: [(tr) => tr.settings.sections.miniPlayer.enable.label, (tr) => tr.settings.sections.miniPlayer.button.label]
					},
					title: (t) => t((tr) => tr.settings.sections.miniPlayer.settings.size.title)
				}
			],
			section: "miniPlayer",
			type: "group"
		}
	],
	stateSchemaInput: {
		manualOverride: z.boolean(),
		rect: z.nullable(z.object({ height: z.number(), width: z.number(), x: z.number(), y: z.number() }))
	}
});
