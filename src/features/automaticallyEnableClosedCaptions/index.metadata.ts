import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["watch", "live"] },
	id: "automaticallyEnableClosedCaptions",
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
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.title)
		}
	]
});
