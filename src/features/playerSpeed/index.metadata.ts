import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";
import { youtubePlayerMaxSpeed, youtubePlayerMinSpeed, youtubePlayerSpeedStep } from "@/src/types";

export const metadata = createFeatureMetadata({
	config: { channelSpeeds: field(z.string(), ""), enabled: field(z.boolean(), false), speed: field(z.number(), 1) },
	dependencies: { includePages: ["watch", "shorts"] },
	id: "playerSpeed",
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
				},
				{
					addLabel: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.channelSpeeds.add),
					channelIdLabel: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.channelSpeeds.channelId),
					component: "key-value-list",
					disabledWhen: [{ equals: false, setting: "playerSpeed.enabled" }],
					getChannelIdFromLinkLabel: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.channelSpeeds.getChannelIdFromLink),
					id: "playerSpeed.channelSpeeds",
					label: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.channelSpeeds.label),
					max: youtubePlayerMaxSpeed,
					min: youtubePlayerMinSpeed,
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.playerSpeed.enable.label
					},
					pasteLinkPlaceholder: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.channelSpeeds.pasteLinkPlaceholder),
					removeLabel: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.channelSpeeds.remove),
					speedLabel: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.channelSpeeds.speed),
					step: youtubePlayerSpeedStep,
					title: (t) => t((tr) => tr.settings.sections.playerSpeed.settings.channelSpeeds.title)
				}
			],
			section: "playerSpeed",
			type: "group"
		}
	],
	state: { playbackSpeed: field(z.number(), 1) }
});
