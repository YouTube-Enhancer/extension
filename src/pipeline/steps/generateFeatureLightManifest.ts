import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { pathToFileURL } from "url";

import type { FeatureKeys } from "@/src/features/_registry/types";

import { writeFormattedFile } from "@/src/utils/plugins/writeFormattedFile";

import { loadFeatureMetadata } from "./loadFeatureMetadata";

export const featureLightManifestPath = resolve(
	process.cwd(),
	"src",
	"features",
	"_registry",
	"generatedFeatureLightManifest.ts"
);

export type FeatureLightManifest = {
	defaults: Partial<Record<FeatureKeys, unknown>>;
	featureIds: FeatureKeys[];
	stateFeatureIds: FeatureKeys[];
};

/**
 * Builds the content/background-facing projection of feature metadata.
 * Single source of truth remains each feature's `index.metadata.ts`.
 */
export async function buildFeatureLightManifest(): Promise<FeatureLightManifest> {
	const loaded = await loadFeatureMetadata();
	const featureIds: FeatureKeys[] = [];
	const stateFeatureIds: FeatureKeys[] = [];
	const defaults: Partial<Record<FeatureKeys, unknown>> = {};

	for (const { metadata } of loaded) {
		if (!metadata) continue;
		const { defaults: featureDefaults, id, stateSchemaInput } = metadata;
		featureIds.push(id);
		if (stateSchemaInput) {
			stateFeatureIds.push(id);
		}
		defaults[id] = featureDefaults;
	}

	featureIds.sort();
	stateFeatureIds.sort();

	// Natural key order so oxlint perfectionist/sort-objects accepts the generated file.
	const sortedDefaults = Object.fromEntries(
		Object.entries(defaults).sort(([a], [b]) => a.localeCompare(b))
	) as Partial<Record<FeatureKeys, unknown>>;

	return { defaults: sortedDefaults, featureIds, stateFeatureIds };
}

export async function generateFeatureLightManifest(): Promise<void> {
	const manifest = await buildFeatureLightManifest();
	const source = renderFeatureLightManifestSource(manifest);
	mkdirSync(dirname(featureLightManifestPath), { recursive: true });
	// Write through the project's oxfmt util so the committed file matches lint.
	await writeFormattedFile(featureLightManifestPath, source);
	const { featureIds, stateFeatureIds } = manifest;
	console.log(
		`[Build Pipeline] Wrote feature light manifest (${featureIds.length} features, ${stateFeatureIds.length} stateful)`
	);
}

/**
 * True when the committed/generated file matches a fresh emit from metadata.
 * Compares semantic content (ids + defaults), not raw text, so oxfmt cannot
 * cause a false stale failure. Used by lint / typecheck / pre-commit.
 */
export async function isFeatureLightManifestUpToDate(): Promise<boolean> {
	const expected = await buildFeatureLightManifest();
	try {
		// Runtime path so a missing file fails the check instead of breaking module load.
		const mod = (await import(pathToFileURL(featureLightManifestPath).href)) as {
			featureLightManifest: FeatureLightManifest;
		};
		const { featureLightManifest: actual } = mod;
		return (
			JSON.stringify(actual.featureIds) === JSON.stringify(expected.featureIds) &&
			JSON.stringify(actual.stateFeatureIds) === JSON.stringify(expected.stateFeatureIds) &&
			JSON.stringify(actual.defaults) === JSON.stringify(expected.defaults)
		);
	} catch {
		return false;
	}
}

export function renderFeatureLightManifestSource(manifest: FeatureLightManifest): string {
	const { defaults, featureIds, stateFeatureIds } = manifest;
	const featureIdsJson = JSON.stringify(featureIds, null, "\t");
	const stateFeatureIdsJson = JSON.stringify(stateFeatureIds, null, "\t");
	const defaultsJson = JSON.stringify(defaults, null, "\t");
	return `// GENERATED FILE — do not edit by hand.
// Source of truth: each feature's index.metadata.ts
// Regenerate: pnpm run lint:manifest -- --write (or pnpm run build:pre)
// Check: pnpm run lint:manifest (also runs in lint, typecheck, and pre-commit)

import type { FeatureKeys } from "@/src/features/_registry/types";

export type FeatureLightManifest = {
	defaults: Partial<Record<FeatureKeys, unknown>>;
	featureIds: readonly FeatureKeys[];
	stateFeatureIds: readonly FeatureKeys[];
};

export const featureLightManifest = {
	defaults: ${defaultsJson} as Partial<Record<FeatureKeys, unknown>>,
	featureIds: ${featureIdsJson},
	stateFeatureIds: ${stateFeatureIdsJson}
} as const satisfies FeatureLightManifest;

export const {
	defaults: featureLightDefaults,
	featureIds: featureLightFeatureIds,
	stateFeatureIds: featureLightStateFeatureIds
} = featureLightManifest;
`;
}

export default generateFeatureLightManifest;
