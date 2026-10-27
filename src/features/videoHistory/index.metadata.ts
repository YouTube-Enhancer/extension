import { z } from "zod/v4-mini";

import { createFeatureMetadata } from "@/src/features/_registry/createFeatureMetadata";
import { field } from "@/src/features/_registry/defineConfig";
import { videoHistoryResumeTypes, videoHistoryStatuses } from "@/src/features/videoHistory/types";

/**
 * One entry of the persisted history map, defined here alongside the feature metadata like every
 * other stateful feature. Exported so the content script enforces the exact same schema at the
 * page-facing write boundary instead of keeping a second copy of the shape.
 */
const videoHistoryEntrySchema = z.object({
	id: z.string(),
	status: z.enum(videoHistoryStatuses),
	timestamp: z.number()
});
export { videoHistoryEntrySchema };

export const metadata = createFeatureMetadata({
	config: {
		enabled: field(z.boolean(), false),
		resumeType: field(z.enum(videoHistoryResumeTypes), "prompt")
	},
	dependencies: { includePages: ["watch"] },
	id: "videoHistory",
	loadPhase: 2,
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
					label: (t) =>
						t((tr) => tr.settings.sections.videoHistory.settings.resumeType.select.label),
					optionsFrom: () =>
						videoHistoryResumeTypes.map((value) => ({
							label: (t) =>
								t(
									(tr) =>
										tr.settings.sections.videoHistory.settings.resumeType.select.options[value]
								),
							value
						})),
					parentSetting: {
						type: "singular",
						value: (tr) => tr.settings.sections.videoHistory.enable.label
					},
					title: (t) =>
						t((tr) => tr.settings.sections.videoHistory.settings.resumeType.select.title)
				}
			],
			section: "videoHistory",
			type: "group"
		}
	],
	state: {
		storage: field(z.record(z.string(), videoHistoryEntrySchema), {})
	}
});
