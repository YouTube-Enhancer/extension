import type { ConstraintTree } from "@/src/validation/types";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { buildNumberConstraints } from "@/src/validation/rules";

export function getNumberConstraints(): ConstraintTree {
	const allSettings: unknown[] = [];
	for (const feature of metadataRegistry.getAll()) {
		if (feature.settings) allSettings.push(...feature.settings);
	}
	return buildNumberConstraints(allSettings);
}

export * from "./rules";
export * from "./types";
