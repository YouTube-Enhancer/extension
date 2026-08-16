import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements } from "@/src/types";
import {
	defaultScreenshotFilenameTemplate,
	screenshotDateFormats,
	screenshotTimestampFormats,
	screenshotTimestampSeparators
} from "@/src/utils/format/filenameTemplate";

import { screenshotFormats, screenshotTypes } from "./types";

export const metadata = createFeatureMetadata({
	button: "screenshotButton",
	config: {
		button: { ...buttonField, placement: field(z.enum(buttonPlacements), "player_controls_left") },
		dateFormat: field(z.enum(screenshotDateFormats), "iso"),
		filename: field(z.string(), defaultScreenshotFilenameTemplate),
		format: field(z.enum(screenshotFormats), "png"),
		saveAs: field(z.enum(screenshotTypes), "file"),
		timestampFormat: field(z.enum(screenshotTimestampFormats), "auto"),
		timestampSeparator: field(z.enum(screenshotTimestampSeparators), "auto")
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
					disabledWhen: [
						{ equals: false, setting: "screenshotButton.button.enabled" },
						{ equals: "clipboard", setting: "screenshotButton.saveAs" }
					],
					id: "screenshotButton.dateFormat",
					label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.dateFormat.select.label),
					optionsFrom: () =>
						screenshotDateFormats.map((dateFormat) => ({
							label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.dateFormat.select.options[dateFormat]),
							value: dateFormat
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
					title: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.dateFormat.select.title)
				},
				{
					component: "select",
					disabledWhen: [
						{ equals: false, setting: "screenshotButton.button.enabled" },
						{ equals: "clipboard", setting: "screenshotButton.saveAs" }
					],
					id: "screenshotButton.timestampFormat",
					label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.timestampFormat.select.label),
					optionsFrom: () =>
						screenshotTimestampFormats.map((timestampFormat) => ({
							label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.timestampFormat.select.options[timestampFormat]),
							value: timestampFormat
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
					title: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.timestampFormat.select.title)
				},
				{
					component: "select",
					disabledWhen: [
						{ equals: false, setting: "screenshotButton.button.enabled" },
						{ equals: "clipboard", setting: "screenshotButton.saveAs" }
					],
					id: "screenshotButton.timestampSeparator",
					label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.timestampSeparator.select.label),
					optionsFrom: () =>
						screenshotTimestampSeparators.map((timestampSeparator) => ({
							label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.timestampSeparator.select.options[timestampSeparator]),
							value: timestampSeparator
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
					title: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.timestampSeparator.select.title)
				},
				{
					component: "file-name-template",
					disabledWhen: [
						{ equals: false, setting: "screenshotButton.button.enabled" },
						{ equals: "clipboard", setting: "screenshotButton.saveAs" }
					],
					error: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.filename.error),
					hint: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.filename.hint),
					id: "screenshotButton.filename",
					label: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.filename.label),
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
					placeholdersLabel: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.filename.placeholdersLabel),
					title: (t) => t((tr) => tr.settings.sections.screenshotButton.settings.filename.title)
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
