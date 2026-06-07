import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		enabled: false
	},
	dependencies: { includePages: ["watch", "live"] },
	id: "automaticallyEnableClosedCaptions",
	schemaInput: {
		enabled: z.boolean()
	},
	settings: [
		{
			component: "checkbox",
			disabledReason: (t) =>
				t((tr) => tr.pages.options.notifications.error.optionConflict, {
					OPTION: t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.label)
				}),
			disabledWhen: [{ equals: true, feature: "automaticallyDisableClosedCaptions", setting: "automaticallyDisableClosedCaptions.enabled" }],
			id: "automaticallyEnableClosedCaptions.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.label),
			section: "automaticBehaviors",
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.title)
		}
	]
});
