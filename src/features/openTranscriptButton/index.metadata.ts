import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { buttonField } from "@/src/features/_registry/defineConfig";

export const metadata = createFeatureMetadata({
	button: "openTranscriptButton",
	config: { button: buttonField },
	dependencies: { includePages: ["watch"] },
	id: "openTranscriptButton",
	settings: [
		{
			component: "checkbox",
			id: "openTranscriptButton.button.enabled",
			label: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.openTranscriptButton.enable.label),
			title: (t) => t((tr) => tr.settings.sections.miscellaneous.settings.openTranscriptButton.enable.title)
		}
	]
});
