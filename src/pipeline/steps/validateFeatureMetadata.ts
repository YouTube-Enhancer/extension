import { validateFeatureMetadata } from "@/src/features/_registry/featureMetadataValidation";

import { loadFeatureMetadata } from "./loadFeatureMetadata";

/**
 * Runs the registry's validation over every feature's metadata, so a malformed entry fails the build here rather than
 * at load on every page: the extension itself only re-checks in development builds.
 */
export default async function validateFeatureMetadataStep(): Promise<void> {
	const features = await loadFeatureMetadata();
	const failures: string[] = [];
	for (const { folder, metadata } of features) {
		if (!metadata) {
			failures.push(`${folder}: index.metadata.ts exports no metadata`);
			continue;
		}
		try {
			validateFeatureMetadata(metadata);
		} catch (error) {
			failures.push(`${folder}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	if (failures.length > 0) {
		throw new Error(`Feature metadata validation failed:\n${failures.map((failure) => `  - ${failure}`).join("\n")}`);
	}
	console.log(`[Build Pipeline] Validated the metadata of ${features.length} features`);
}
