import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";

import type { FeatureKeys, FeatureMetadata } from "@/src/features/_registry/types";

import { validateFeatureMetadata } from "@/src/features/_registry/featureMetadataValidation";

/**
 * Loads every feature's index.metadata.ts and runs the registry's validation over it, so a malformed entry fails the
 * build here rather than at load on every page: the extension itself only re-checks in development builds.
 */
export default async function validateFeatureMetadataStep(): Promise<void> {
	const featuresDir = resolve(process.cwd(), "src", "features");
	const folders = readdirSync(featuresDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(featuresDir, entry.name, "index.metadata.ts")))
		.map((entry) => entry.name)
		.sort();
	const failures: string[] = [];
	for (const folder of folders) {
		const modulePath = join(featuresDir, folder, "index.metadata.ts");
		const { metadata } = (await import(pathToFileURL(modulePath).href)) as { metadata?: FeatureMetadata<FeatureKeys> };
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
	console.log(`[Build Pipeline] Validated the metadata of ${folders.length} features`);
}
