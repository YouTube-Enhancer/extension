import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField, field } from "@/src/features/_registry/defineConfig";
import { buttonPlacements } from "@/src/types";

export const metadata = createFeatureMetadata({
	button: "maximizePlayerButton",
	config: { button: { ...buttonField, placement: field(z.enum(buttonPlacements), "feature_menu") } },
	dependencies: { includePages: ["watch", "live"] },
	id: "maximizePlayerButton",
	settings: [
		{
			component: "checkbox",
			id: "maximizePlayerButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.maximizePlayerButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.maximizePlayerButton.enable.title)
		}
	],
	state: {
		header: { timeout: field(z.nullable(z.number()), null), visible: field(z.boolean(), false) },
		isProgrammaticClick: field(z.boolean(), false),
		listenersAttached: field(z.boolean(), false)
	}
});
