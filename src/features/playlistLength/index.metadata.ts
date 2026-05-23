import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

import { playlistLengthGetMethod, playlistWatchTimeGetMethod } from "./types";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false, lengthGetMethod: "api", watchTimeGetMethod: "youtube" },
	dependencies: { includePages: ["watch", "playlist"] },
	id: "playlistLength",
	schemaInput: {
		enabled: z.boolean(),
		lengthGetMethod: z.enum(playlistLengthGetMethod),
		watchTimeGetMethod: z.enum(playlistWatchTimeGetMethod)
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.playlistLength.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "playlistLength.enabled",
					label: (t) => t((tr) => tr.settings.sections.playlistLength.enable.label),
					title: (t) => t((tr) => tr.settings.sections.playlistLength.enable.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "playlistLength.enabled" }],
					id: "playlistLength.lengthGetMethod",
					label: (t) => t((tr) => tr.settings.sections.playlistLength.settings.wayToGetLength.select.label),
					optionsFrom: () =>
						playlistLengthGetMethod.map((value) => ({
							label: () => value.toUpperCase(),
							value
						})),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.playlistLength.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.playlistLength.settings.wayToGetLength.select.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "playlistLength.enabled" }],
					id: "playlistLength.watchTimeGetMethod",
					label: (t) => t((tr) => tr.settings.sections.playlistLength.settings.wayToGetWatchTime.select.label),
					optionsFrom: () =>
						playlistWatchTimeGetMethod.map((value) => ({
							label: (t) => t((tr) => tr.settings.sections.playlistLength.settings.wayToGetWatchTime.select.options[value]),
							value
						})),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.playlistLength.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.playlistLength.settings.wayToGetWatchTime.select.title)
				}
			],
			section: "playlistLength",
			type: "group"
		}
	]
});
