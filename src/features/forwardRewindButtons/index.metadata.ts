import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	button: ["forwardButton", "rewindButton"],
	config: {
		button: { ...buttonField, placement: field(z.enum(buttonPlacements), "player_controls_right") },
		time: field(z.number(), 5)
	},
	dependencies: { includePages: ["watch"] },
	id: "forwardRewindButtons",
	loadPhase: 1,
	sectionTitle: (t) => t((tr) => tr.settings.sections.videoSeeking.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "forwardRewindButtons.button.enabled",
					label: (t) =>
						t((tr) => tr.settings.sections.videoSeeking.settings.forwardRewindButtons.enable.label),
					title: (t) =>
						t((tr) => tr.settings.sections.videoSeeking.settings.forwardRewindButtons.enable.title)
				},
				{
					component: "number",
					disabledWhen: [{ equals: false, setting: "forwardRewindButtons.button.enabled" }],
					id: "forwardRewindButtons.time",
					label: (t) =>
						t((tr) => tr.settings.sections.videoSeeking.settings.forwardRewindButtons.time.label),
					max: 30,
					min: 1,
					parentSetting: {
						type: "singular",
						value: (tr) =>
							tr.settings.sections.videoSeeking.settings.forwardRewindButtons.enable.label
					},
					step: 1,
					title: (t) =>
						t((tr) => tr.settings.sections.videoSeeking.settings.forwardRewindButtons.time.title)
				}
			],
			section: "videoSeeking",
			type: "group"
		}
	]
});
