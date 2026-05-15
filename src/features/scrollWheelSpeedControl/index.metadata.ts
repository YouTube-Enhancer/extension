import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { modifierKeys } from "@/src/types";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false, modifierKey: "altKey", steps: 0.25 },
	id: "scrollWheelSpeedControl",
	schemaInput: { enabled: z.boolean(), modifierKey: z.enum(modifierKeys), steps: z.number() },
	sectionTitle: (t) => t((tr) => tr.settings.sections.scrollWheelSpeedControl.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "scrollWheelSpeedControl.enabled",
					label: (t) => t((tr) => tr.settings.sections.scrollWheelSpeedControl.enable.label),
					title: (t) => t((tr) => tr.settings.sections.scrollWheelSpeedControl.enable.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "scrollWheelSpeedControl.enabled" }],
					id: "scrollWheelSpeedControl.modifierKey",
					label: (t) => t((tr) => tr.settings.sections.scrollWheelSpeedControl.settings.modifierKey.select.label),
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
						value: (tr) => tr.settings.sections.scrollWheelSpeedControl.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.scrollWheelSpeedControl.settings.modifierKey.select.title)
				},
				{
					component: "number",
					disabledWhen: [{ equals: false, setting: "scrollWheelSpeedControl.enabled" }],
					id: "scrollWheelSpeedControl.steps",
					label: (t) => t((tr) => tr.settings.sections.scrollWheelSpeedControl.settings.adjustmentSteps.label),
					max: 1,
					min: 0.05,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.scrollWheelSpeedControl.enable.label
					},
					step: 0.05,
					title: (t) => t((tr) => tr.settings.sections.scrollWheelSpeedControl.settings.adjustmentSteps.title)
				}
			],
			section: "scrollWheelSpeedControl",
			type: "group"
		}
	]
});
