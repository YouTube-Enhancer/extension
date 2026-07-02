import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: {
		channel: { enabled: field(z.boolean(), false) },
		home: { enabled: field(z.boolean(), false) },
		search: { enabled: field(z.boolean(), false) },
		sidebar: { enabled: field(z.boolean(), false) },
		subscriptions: { enabled: field(z.boolean(), false) },
		videos: { enabled: field(z.boolean(), false) }
	},
	dependencies: { includePages: ["watch", "home", "search", "channel_home", "channel_videos", "channel_posts", "channel_streams", "subscriptions"] },
	id: "hideShorts",
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
				},
				{
					component: "checkbox",
					id: "hideShorts.subscriptions.enabled",
					label: (t) => t((tr) => tr.settings.sections.hideShorts.settings.subscriptions.label),
					section: "hideShorts",
					title: (t) => t((tr) => tr.settings.sections.hideShorts.settings.subscriptions.title)
				}
			],
			section: "hideShorts",
			type: "group"
		}
	]
});
