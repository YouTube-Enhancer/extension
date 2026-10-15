import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";
import { youtubePlayerSpeedStep } from "@/src/types";

export const metadata = createFeatureMetadata({
	config: {
		enabled: field(z.boolean(), false),
		speed: field(z.number(), 0.25)
	},
	dependencies: { includePages: ["watch", "shorts"] },
	id: "playbackSpeedBoostGesture",
	loadPhase: 1,
	sectionTitle: (t) => t((tr) => tr.settings.sections.playerSpeed.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "playbackSpeedBoostGesture.enabled",
					label: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.boostGesture.label),
					title: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.boostGesture.title)
				},
				{
					component: "number",
					disabledWhen: [{ equals: false, setting: "playbackSpeedBoostGesture.enabled" }],
					id: "playbackSpeedBoostGesture.speed",
					label: (t) =>
						t((tr) => tr.settings.sections.playerSpeed.settings.boostGesture.select.label),
					max: 1,
					min: youtubePlayerSpeedStep,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.playerSpeed.settings.boostGesture.label
					},
					step: youtubePlayerSpeedStep,
					title: (t) =>
						t((tr) => tr.settings.sections.playerSpeed.settings.boostGesture.select.title)
				}
			],
			section: "playerSpeed",
			type: "group"
		}
	]
});
