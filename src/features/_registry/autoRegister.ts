import type { AnyFeatureBase, FeatureKeys, FeatureKeysWithState, FeatureState } from "@/src/features/_registry/types";

import { waitForIdle } from "@/src/utils/dom/idle";
import { waitForSpecificMessage } from "@/src/utils/messaging";

import { metadataRegistry } from "./featureMetadataRegistry";
import { registry } from "./featureRegistry";

/**
 * Register all features for runtime.
 * Lazily imports each feature chunk and registers it with the registry.
 * Features are loaded in phases based on their metadata's loadPhase:
 *   - Phase 0: Immediate (global features, player controls)
 *   - Phase 1: After first paint (watch-page buttons, hide features)
 *   - Phase 2: When idle (complex observers, rare features)
 */
export async function registerAllFeatures(initialState?: Record<FeatureKeysWithState, FeatureState[`state:${FeatureKeysWithState}`]>) {
	const allModules = import.meta.glob<{ default?: AnyFeatureBase }>("/src/features/*/index.ts");
	const state = initialState ?? (await waitForSpecificMessage("state", "request_data", "extension")).data;

	// Build lookup: featureId → import function
	const moduleById = new Map<FeatureKeys, () => Promise<{ default?: AnyFeatureBase }>>();
	for (const [path, importFn] of Object.entries(allModules) as [string, () => Promise<{ default?: AnyFeatureBase }>][] ) {
		const match = path.match(/\/src\/features\/([^/]+)\//);
		if (match) moduleById.set(match[1] as FeatureKeys, importFn);
	}

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

	// Phase 2: Import when idle
	const phase2 = phases.get(2) ?? [];
	if (phase2.length > 0) {
		await waitForIdle(500);
		await Promise.all(phase2.map((id) => importFeature(id, moduleById, state)));
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
