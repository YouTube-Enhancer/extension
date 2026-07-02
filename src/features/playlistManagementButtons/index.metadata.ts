import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { removeButton: { enabled: field(z.boolean(), false) }, resetButton: { enabled: field(z.boolean(), false) } },
	dependencies: { includePages: ["playlist"] },
	id: "playlistManagementButtons",
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
