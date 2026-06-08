import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";

export const metadata = createFeatureMetadata({
	defaults: { enabled: false },
	dependencies: { includePages: ["watch", "live", "shorts"] },
	id: "rememberVolume",
	schemaInput: { enabled: z.boolean() },
	settings: [
		{
			component: "checkbox",
			disabledReason: (t) => t((tr) => tr.pages.options.extras.optionDisabled.specificOption.rememberVolume),
			disabledWhen: [{ equals: true, feature: "globalVolume", setting: "globalVolume.enabled" }],
			id: "rememberVolume.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.rememberVolume.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.rememberVolume.enable.title)
		}
	],
	stateSchemaInput: { shortsPageVolume: z.number(), watchPageVolume: z.number() }
});
