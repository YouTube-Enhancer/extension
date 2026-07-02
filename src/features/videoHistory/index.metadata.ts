import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";
import { videoHistoryResumeTypes, videoHistoryStatuses } from "@/src/features/videoHistory/types";

export const metadata = createFeatureMetadata({
	config: { enabled: field(z.boolean(), false), resumeType: field(z.enum(videoHistoryResumeTypes), "prompt") },
	dependencies: { includePages: ["watch"] },
	id: "videoHistory",
	sectionTitle: (t) => t((tr) => tr.settings.sections.videoHistory.title),
	settings: [
		{
			children: [
				{
					component: "checkbox",
					id: "videoHistory.enabled",
					label: (t) => t((tr) => tr.settings.sections.videoHistory.enable.label),
					title: (t) => t((tr) => tr.settings.sections.videoHistory.enable.title)
				},
				{
					component: "select",
					disabledWhen: [{ equals: false, setting: "videoHistory.enabled" }],
					id: "videoHistory.resumeType",
					label: (t) => t((tr) => tr.settings.sections.videoHistory.settings.resumeType.select.label),
					optionsFrom: () =>
						videoHistoryResumeTypes.map((value) => ({
							label: (t) => t((tr) => tr.settings.sections.videoHistory.settings.resumeType.select.options[value]),
							value
						})),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.videoHistory.enable.label
					},
					title: (t) => t((tr) => tr.settings.sections.videoHistory.settings.resumeType.select.title)
				}
			],
			section: "videoHistory",
			type: "group"
		}
	],
	state: { storage: field(z.record(z.string(), z.object({ id: z.string(), status: z.enum(videoHistoryStatuses), timestamp: z.number() })), {}) }
});
