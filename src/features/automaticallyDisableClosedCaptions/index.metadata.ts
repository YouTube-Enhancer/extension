import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: {
		enabled: false
	},
	id: "automaticallyDisableClosedCaptions",
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
			disabledWhen: [{ equals: true, feature: "automaticallyEnableClosedCaptions", setting: "automaticallyEnableClosedCaptions.enabled" }],
			id: "automaticallyDisableClosedCaptions.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.title)
		}
	]
});
