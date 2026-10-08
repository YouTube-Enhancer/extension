import type {
	AnyFeatureBase,
	FeatureKeys,
	FeatureKeysWithState,
	FeatureState
} from "@/src/features/_registry/types";

import { waitForIdle } from "@/src/utils/dom/idle";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import { metadataRegistry } from "./featureMetadataRegistry";
import { registry } from "./featureRegistry";

/**
 * Glob keys modules by directory name; phases are keyed by feature id.
 * The index is feature id → import function after this mapping.
 */
export function buildModuleIndex(
	allModules: Record<string, () => Promise<{ default?: AnyFeatureBase }>>
): Map<FeatureKeys, () => Promise<{ default?: AnyFeatureBase }>> {
	const moduleById = new Map<FeatureKeys, () => Promise<{ default?: AnyFeatureBase }>>();
	for (const path of Object.keys(allModules)) {
		const { [path]: importFn } = allModules;
		const match = path.match(/\/src\/features\/([^/]+)\//);
		if (match && importFn) moduleById.set(match[1] as FeatureKeys, importFn);
	}
	return moduleById;
}

/**
 * Register all features for runtime.
 * Lazily imports each feature chunk and registers it with the registry.
 * Features are loaded in phases based on their metadata's loadPhase:
 *   - Phase 0: Immediate (global features, player controls)
 *   - Phase 1: After first paint (watch-page buttons, hide features)
 *   - Phase 2: When idle (complex observers, rare features)
 */
export async function registerAllFeatures(
	initialState?: Record<FeatureKeysWithState, FeatureState[`state:${FeatureKeysWithState}`]>
) {
	const allModules = import.meta.glob<{ default?: AnyFeatureBase }>("/src/features/*/index.ts");
	const state =
		initialState ?? (await waitForSpecificMessage("state", "request_data", "extension")).data;

	const moduleById = buildModuleIndex(allModules);
	warnOnMissingFeatureDirectories(moduleById);

	const phases = metadataRegistry.getFeaturesByLoadPhase();

	// Phase 0: Import immediately
	const phase0 = phases.get(0) ?? [];
	await Promise.all(phase0.map((id) => importFeature(id, moduleById, state)));

	// Phase 1: Import after first paint
	const phase1 = phases.get(1) ?? [];
	if (phase1.length > 0) {
		await waitForIdle();
		await Promise.all(phase1.map((id) => importFeature(id, moduleById, state)));
	}

	// Phase 2: import in the background so page-matching features can enable as their
	// chunks land (register() late-enables when the registry is initialized). The await
	// still runs: pageLoaded must keep meaning that every feature is registered, or a
	// config change arriving right after it is reconciled against nothing.
	const phase2 = phases.get(2) ?? [];
	if (phase2.length > 0) {
		await waitForIdle(500);
		await Promise.all(phase2.map((id) => importFeature(id, moduleById, state)));
	}
}

/** A directory whose name differs from its feature id would be silently skipped at import time. */
export function warnOnMissingFeatureDirectories(
	moduleById: Map<FeatureKeys, () => Promise<{ default?: AnyFeatureBase }>>
): void {
	for (const { id } of metadataRegistry.getAll()) {
		if (!moduleById.has(id)) {
			console.warn(
				`[features] Feature "${id}" has no src/features/${id}/ directory. ` +
					"The directory name must match the feature id, or the feature will never register."
			);
		}
	}
}

async function importFeature(
	id: FeatureKeys,
	moduleById: Map<FeatureKeys, () => Promise<{ default?: AnyFeatureBase }>>,
	state: Record<FeatureKeysWithState, FeatureState[`state:${FeatureKeysWithState}`]>
) {
	const importFn = moduleById.get(id);
	if (!importFn) return;
	try {
		const { default: feature } = await importFn();
		if (!feature) return;
		await registry.register(feature, state);
	} catch (e) {
		console.error(`Failed to register feature ${String(id)}:`, e);
	}
}
