import { z } from "zod/v4-mini";

import { deepDarkPreset } from "@/src/deepDarkPresets";
import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		colors: {
			colorShadow: "#383c4a4d",
			dimmerText: "#cccccc",
			hoverBackground: "#4e5467",
			mainBackground: "#22242d",
			mainColor: "#367bf0",
			mainText: "#eeeeee",
			secondBackground: "#242730"
		},
		enabled: false,
		preset: "Deep-Dark"
	},
	id: "deepDarkCSS",
	schemaInput: {
		colors: z.object({
			colorShadow: z.string(),
			dimmerText: z.string(),
			hoverBackground: z.string(),
			mainBackground: z.string(),
			mainColor: z.string(),
			mainText: z.string(),
			secondBackground: z.string()
		}),
		enabled: z.boolean(),
		preset: z.enum(deepDarkPreset)
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.deepDarkCSS.title),
	settings: [
		{
			attribution: [
				{
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.extras.author),
					url: "https://github.com/RaitaroH"
				},
				{
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.extras["co-authors"]),
					url: "https://github.com/MechaLynx"
				}
			],
			children: [
				{
					component: "checkbox",
					id: "deepDarkCSS.enabled",
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.enable.label),
					title: (t) => t((tr) => tr.settings.sections.deepDarkCSS.enable.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "deepDarkCSS.enabled" }],
					id: "deepDarkCSS.preset",
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.theme.select.label),
					optionsFrom: () => deepDarkPreset.map((value) => ({ label: () => value, value })),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.deepDarkCSS.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.theme.select.title)
				},
				{
					component: "color-picker",
					id: "deepDarkCSS.colors.mainColor",
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.mainColor.label),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.deepDarkCSS.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.mainColor.title),
					visibleWhen: [{ equals: "Custom", setting: "deepDarkCSS.preset" }]
				},
				{
					component: "color-picker",
					id: "deepDarkCSS.colors.mainBackground",
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.mainBackground.label),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.deepDarkCSS.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.mainBackground.title),
					visibleWhen: [{ equals: "Custom", setting: "deepDarkCSS.preset" }]
				},
				{
					component: "color-picker",
					id: "deepDarkCSS.colors.secondBackground",
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.secondBackground.label),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.deepDarkCSS.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.secondBackground.title),
					visibleWhen: [{ equals: "Custom", setting: "deepDarkCSS.preset" }]
				},
				{
					component: "color-picker",
					id: "deepDarkCSS.colors.hoverBackground",
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.hoverBackground.label),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.deepDarkCSS.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.hoverBackground.title),
					visibleWhen: [{ equals: "Custom", setting: "deepDarkCSS.preset" }]
				},
				{
					component: "color-picker",
					id: "deepDarkCSS.colors.mainText",
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.mainText.label),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.deepDarkCSS.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.mainText.title),
					visibleWhen: [{ equals: "Custom", setting: "deepDarkCSS.preset" }]
				},
				{
					component: "color-picker",
					id: "deepDarkCSS.colors.dimmerText",
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.dimmerText.label),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.deepDarkCSS.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.dimmerText.title),
					visibleWhen: [{ equals: "Custom", setting: "deepDarkCSS.preset" }]
				},
				{
					component: "color-picker",
					id: "deepDarkCSS.colors.colorShadow",
					label: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.colorShadow.label),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.deepDarkCSS.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.deepDarkCSS.settings.colorShadow.title),
					visibleWhen: [{ equals: "Custom", setting: "deepDarkCSS.preset" }]
				}
			],
			section: "deepDarkCSS",
			type: "group"
		}
	]
});
