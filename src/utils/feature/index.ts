import type { AllButtonNames, SingleButtonFeatureNames } from "@/src/types";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";

export function findKeyByValue(value: Exclude<AllButtonNames, SingleButtonFeatureNames>) {
	return metadataRegistry.getButtonFeature(value);
}
