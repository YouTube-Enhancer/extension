import type { CoreFeatureKeys, FeatureKeys, NonFeatureKeys } from "@/src/features/_registry/types";
import type { configuration, Path } from "@/src/types";

import { featureLightDefaults } from "@/src/features/_registry/generatedFeatureLightManifest";

const coreConfiguration = {
	featureMenu: { openType: "click" },
	language: "en-US",
	onScreenDisplay: {
		color: "white",
		hideTime: 750,
		opacity: 75,
		padding: 5,
		position: "center",
		type: "text"
	},
	openSettingsOnMajorOrMinorVersionChange: true,
	youtubeDataApiV3Key: ""
} as const satisfies Pick<configuration, CoreFeatureKeys | NonFeatureKeys>;
export type CoreSettingsKey = Path<typeof coreConfiguration>;
export const getDefaultConfiguration = () => {
	return {
		...coreConfiguration,
		...(featureLightDefaults as Pick<configuration, FeatureKeys>)
	} satisfies configuration;
};
