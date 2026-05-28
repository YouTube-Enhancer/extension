import type { AllButtonNames, SingleButtonFeatureNames } from "@/src/types";

import { featureToMultiButtonsMap } from "@/src/types";

export function findKeyByValue(value: Exclude<AllButtonNames, SingleButtonFeatureNames>) {
	for (const [key, values] of featureToMultiButtonsMap.entries()) {
		if (values.includes(value)) {
			return key;
		}
	}
	return undefined;
}
