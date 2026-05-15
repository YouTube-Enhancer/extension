import { z } from "zod/v4-mini";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { featureMenuOpenTypes } from "@/src/features/featureMenu/types";
import { availableLocales } from "@/src/i18n/constants";
import { onScreenDisplayColors, onScreenDisplayPositions, onScreenDisplayTypes } from "@/src/ui/OnScreenDisplayManager/types";

const coreConfigurationImportSchema = {
	featureMenu: z.optional(z.object({ openType: z.enum(featureMenuOpenTypes) })),
	language: z.optional(z.enum(availableLocales)),
	onScreenDisplay: z.optional(
		z.object({
			color: z.enum(onScreenDisplayColors),
			hideTime: z.number(),
			opacity: z.number(),
			padding: z.number(),
			position: z.enum(onScreenDisplayPositions),
			type: z.enum(onScreenDisplayTypes)
		})
	),
	openSettingsOnMajorOrMinorVersionChange: z.optional(z.boolean()),
	youtubeDataApiV3Key: z.optional(z.string())
};
export const getConfigurationImportSchema = () => {
	return z.object({ ...metadataRegistry.getImportSchemaShape(), ...coreConfigurationImportSchema });
};
