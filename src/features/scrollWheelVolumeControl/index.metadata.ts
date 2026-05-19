import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { modifierKeys } from "@/src/types";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false, holdModifierKey: false, holdRightClick: false, modifierKey: "ctrlKey", steps: 5 },
	id: "scrollWheelVolumeControl",
	schemaInput: {
		enabled: z.boolean(),
		holdModifierKey: z.boolean(),
		holdRightClick: z.boolean(),
		modifierKey: z.enum(modifierKeys),
		steps: z.number()
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "scrollWheelVolumeControl.enabled",
					label: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.enable.label),
					title: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.enable.title)
				},
				{
					component: "checkbox",
					disabledWhen: [{ equals: false, setting: "scrollWheelVolumeControl.enabled" }],
					id: "scrollWheelVolumeControl.holdRightClick",
					label: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.settings.holdRightClick.label),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.scrollWheelVolumeControl.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.settings.holdRightClick.title)
				},
				{
					component: "checkbox",
					disabledWhen: [{ equals: false, setting: "scrollWheelVolumeControl.enabled" }],
					id: "scrollWheelVolumeControl.holdModifierKey",
					label: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.label),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.scrollWheelVolumeControl.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "scrollWheelVolumeControl.holdModifierKey" }],
					id: "scrollWheelVolumeControl.modifierKey",
					label: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.select.label),
					optionsFrom: () =>
						modifierKeys.map((key) => {
							const keyValue =
								key === "altKey" ? "Alt"
								: key === "ctrlKey" ? "Ctrl"
								: "Shift";
							return {
								label: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.extras.optionLabel, { KEY: keyValue }),
								value: key
							};
						}),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.scrollWheelVolumeControl.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.select.title)
				},
				{
					component: "number",
					disabledWhen: [{ equals: false, setting: "scrollWheelVolumeControl.enabled" }],
					id: "scrollWheelVolumeControl.steps",
					label: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.settings.adjustmentSteps.label),
					max: 100,
					min: 1,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.scrollWheelVolumeControl.enable.label
					},
					step: 1,
					title: (t) => t((tr) => tr.settings.sections.scrollWheelVolumeControl.settings.adjustmentSteps.title)
				}
			],
			section: "scrollWheelVolumeControl",
			type: "group"
		}
	]
});
