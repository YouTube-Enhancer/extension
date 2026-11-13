import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";

/**
 * The volumes hydrateState starts from when nothing has been recorded yet. The feature state and
 * the document-start seed both read this, so the stored seed always matches what the feature would
 * apply.
 */
export const initialState = { shortsPageVolume: 25, watchPageVolume: 25 };

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false) },
	dependencies: { includePages: ["watch", "live", "shorts"] },
	id: "rememberVolume",
	loadPhase: 0,
	settings: [
		{
			component: "checkbox",
			disabledReason: (t) =>
				t((tr) => tr.pages.options.extras.optionDisabled.specificOption.rememberVolume),
			disabledWhen: [{ equals: true, feature: "globalVolume", setting: "globalVolume.enabled" }],
			id: "rememberVolume.enabled",
			label: (t) =>
				t((tr) => tr.settings.sections.miscellaneous.settings.rememberVolume.enable.label),
			title: (t) =>
				t((tr) => tr.settings.sections.miscellaneous.settings.rememberVolume.enable.title)
		}
	],
	state: {
		shortsPageVolume: field(z.number(), initialState.shortsPageVolume),
		watchPageVolume: field(z.number(), initialState.watchPageVolume)
	}
});
