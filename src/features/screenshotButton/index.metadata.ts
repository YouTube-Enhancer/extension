import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements } from "@/src/types";

import { screenshotFormats, screenshotTypes } from "./types";
export const metadata = createFeatureMetadata({
	button: "screenshotButton",
	config: {
		button: { ...buttonField, placement: field(z.enum(buttonPlacements), "player_controls_left") },
		format: field(z.enum(screenshotFormats), "png"),
		saveAs: field(z.enum(screenshotTypes), "file")
	},
	dependencies: { includePages: ["watch", "live"] },
	id: "screenshotButton",
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
