import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["watch", "live", "shorts"] },
	id: "rememberVolume",
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
	state: { shortsPageVolume: field(z.number(), 100), watchPageVolume: field(z.number(), 100) }
});
