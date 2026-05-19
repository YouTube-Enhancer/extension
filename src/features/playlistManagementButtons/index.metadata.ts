import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { removeButton: { enabled: false }, resetButton: { enabled: false } },
	id: "playlistManagementButtons",
	schemaInput: { removeButton: z.object({ enabled: z.boolean() }), resetButton: z.object({ enabled: z.boolean() }) },
	sectionTitle: (t) => t((tr) => tr.settings.sections.playlistManagementButtons.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "playlistManagementButtons.removeButton.enabled",
					label: (t) => t((tr) => tr.settings.sections.playlistManagementButtons.settings.removeVideoButton.enable.label),
					title: (t) => t((tr) => tr.settings.sections.playlistManagementButtons.settings.removeVideoButton.enable.title)
				},
				{
					component: "checkbox",
					id: "playlistManagementButtons.resetButton.enabled",
					label: (t) => t((tr) => tr.settings.sections.playlistManagementButtons.settings.markAsUnwatchedButton.enable.label),
					title: (t) => t((tr) => tr.settings.sections.playlistManagementButtons.settings.markAsUnwatchedButton.enable.title)
				}
			],
			section: "playlistManagementButtons",
			type: "group"
		}
	]
});
