import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		channel: {
			enabled: false
		},
		home: {
			enabled: false
		},
		search: {
			enabled: false
		},
		sidebar: {
			enabled: false
		},
		videos: {
			enabled: false
		}
	},
	id: "hideShorts",
	schemaInput: {
		channel: z.object({
			enabled: z.boolean()
		}),
		home: z.object({
			enabled: z.boolean()
		}),
		search: z.object({
			enabled: z.boolean()
		}),
		sidebar: z.object({
			enabled: z.boolean()
		}),
		videos: z.object({
			enabled: z.boolean()
		})
	},
	sectionTitle: (t) => t((tr) => tr.settings.sections.hideShorts.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "hideShorts.channel.enabled",
					label: (t) => t((tr) => tr.settings.sections.hideShorts.settings.channel.label),
					section: "hideShorts",
					title: (t) => t((tr) => tr.settings.sections.hideShorts.settings.channel.title)
				},
				{
					component: "checkbox",
					id: "hideShorts.home.enabled",
					label: (t) => t((tr) => tr.settings.sections.hideShorts.settings.home.label),
					section: "hideShorts",
					title: (t) => t((tr) => tr.settings.sections.hideShorts.settings.home.title)
				},
				{
					component: "checkbox",
					id: "hideShorts.search.enabled",
					label: (t) => t((tr) => tr.settings.sections.hideShorts.settings.search.label),
					section: "hideShorts",
					title: (t) => t((tr) => tr.settings.sections.hideShorts.settings.search.title)
				},
				{
					component: "checkbox",
					id: "hideShorts.sidebar.enabled",
					label: (t) => t((tr) => tr.settings.sections.hideShorts.settings.sidebar.label),
					section: "hideShorts",
					title: (t) => t((tr) => tr.settings.sections.hideShorts.settings.sidebar.title)
				},
				{
					component: "checkbox",
					id: "hideShorts.videos.enabled",
					label: (t) => t((tr) => tr.settings.sections.hideShorts.settings.videos.label),
					section: "hideShorts",
					title: (t) => t((tr) => tr.settings.sections.hideShorts.settings.videos.title)
				}
			],
			section: "hideShorts",
			type: "group"
		}
	]
});
