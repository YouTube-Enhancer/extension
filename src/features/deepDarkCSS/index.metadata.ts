import { z } from "zod/v4-mini";

import { deepDarkPreset } from "@/src/deepDarkPresets";
import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: {
		colors: {
			colorShadow: field(z.string(), "#383c4a4d"),
			dimmerText: field(z.string(), "#cccccc"),
			hoverBackground: field(z.string(), "#4e5467"),
			mainBackground: field(z.string(), "#22242d"),
			mainColor: field(z.string(), "#367bf0"),
			mainText: field(z.string(), "#eeeeee"),
			secondBackground: field(z.string(), "#242730")
		},
		enabled: field(z.boolean(), false),
		preset: field(z.enum(deepDarkPreset), "Deep-Dark")
	},
	id: "deepDarkCSS",
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
