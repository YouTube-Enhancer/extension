import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { youtubePlayerMaxSpeed, youtubePlayerMinSpeed, youtubePlayerSpeedStep } from "@/src/types";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false, speed: 1 },
	id: "playerSpeed",
	schemaInput: { enabled: z.boolean(), speed: z.number() },
	sectionTitle: (t) => t((tr) => tr.settings.sections.playerSpeed.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "playerSpeed.enabled",
					label: (t) => t((tr) => tr.settings.sections.playerSpeed.enable.label),
					title: (t) => t((tr) => tr.settings.sections.playerSpeed.enable.title)
				},
				{
					component: "number",
					disabledWhen: [{ equals: false, setting: "playerSpeed.enabled" }],
					id: "playerSpeed.speed",
					label: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.speed.select.label),
					max: youtubePlayerMaxSpeed,
					min: youtubePlayerMinSpeed,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.playerSpeed.enable.label
					},
					step: youtubePlayerSpeedStep,
					title: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.speed.select.title)
				}
			],
			section: "playerSpeed",
			type: "group"
		}
	],
	stateSchemaInput: { playbackSpeed: z.number() }
});
