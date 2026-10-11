import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

const liveStreamChatModes = ["always", "fullscreen"] as const;

export const metadata = createFeatureMetadata({
	config: {
		enabled: field(z.boolean(), false),
		mode: field(z.enum(liveStreamChatModes), "always")
	},
	dependencies: { includePages: ["live", "watch"] },
	id: "hideLiveStreamChat",
	loadPhase: 2,
	sectionTitle: (t) => t((tr) => tr.settings.sections.hideLiveStreamChat.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "hideLiveStreamChat.enabled",
					label: (t) => t((tr) => tr.settings.sections.hideLiveStreamChat.enable.label),
					title: (t) => t((tr) => tr.settings.sections.hideLiveStreamChat.enable.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "hideLiveStreamChat.enabled" }],
					id: "hideLiveStreamChat.mode",
					label: (t) =>
						t((tr) => tr.settings.sections.hideLiveStreamChat.settings.mode.select.label),
					optionsFrom: () =>
						liveStreamChatModes.map((mode) => ({
							label: (t) =>
								t(
									(tr) => tr.settings.sections.hideLiveStreamChat.settings.mode.select.options[mode]
								),
							value: mode
						})),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.hideLiveStreamChat.enable.label
					},
					title: (t) =>
						t((tr) => tr.settings.sections.hideLiveStreamChat.settings.mode.select.title)
				}
			],
			section: "hideLiveStreamChat",
			type: "group"
		}
	]
});
