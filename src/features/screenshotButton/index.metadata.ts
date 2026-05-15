import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonPlacements, fullscreenPlacements } from "@/src/types";

import { screenshotFormats, screenshotTypes } from "./types";
export const metadata = createFeatureMetadata({
	defaults: {
		button: {
			enabled: false,
			fullscreenPlacement: "same",
			placement: "player_controls_left"
		},
		format: "png",
		saveAs: "file"
	},
	id: "screenshotButton",
	schemaInput: {
		button: z.object({
			enabled: z.boolean(),
			fullscreenPlacement: z.enum(fullscreenPlacements),
			placement: z.enum(buttonPlacements)
		}),
		format: z.enum(screenshotFormats),
		saveAs: z.enum(screenshotTypes)
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.screenshotButton.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "screenshotButton.button.enabled",
					label: (t) => t((tr) => tr.settings.sections.screenshotButton.enable.label),
					title: (t) => t((tr) => tr.settings.sections.screenshotButton.enable.title)
				},
				{
					component: "select",
					disabledWhen: [
						{ equals: false, setting: "screenshotButton.button.enabled" },
						{ equals: "clipboard", setting: "screenshotButton.saveAs" }
					],
					id: "screenshotButton.format",
					label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.format.label),
					optionsFrom: () =>
						screenshotFormats.map((format) => ({
							label: () => format.toUpperCase(),
							value: format
						})),
					parentSetting: ({ button: { enabled }, saveAs }) => {
						if (enabled && saveAs === "clipboard") {
							return {
								type: "specificOption",
								value: (tr) => tr.pages.options.extras.optionDisabled.specificOption.screenshotButtonFileFormat
							};
						}
						return {
							type: "singular",
							value: (tr) => tr.settings.sections.screenshotButton.enable.label
						};
					},
					title: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.format.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "screenshotButton.button.enabled" }],
					id: "screenshotButton.saveAs",
					label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.saveAs.select.label),
					optionsFrom: () =>
						screenshotTypes.map((type) => ({
							label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.saveAs.select.options[type]),
							value: type
						})),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.screenshotButton.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.saveAs.select.title)
				}
			],
			section: "screenshotButton",
			type: "group"
		}
	]
});
