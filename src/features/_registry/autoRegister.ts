import type { AnyFeatureBase, FeatureKeysWithState, FeatureState } from "@/src/features/_registry/types";

import { waitForSpecificMessage } from "@/src/utils/messaging";

import { registry } from "./featureRegistry";
/**
 * Register all features for runtime.
 * Lazily imports each feature chunk and registers it with the registry.
 * Uses default export
 */
export async function registerAllFeatures(initialState?: Record<FeatureKeysWithState, FeatureState[`state:${FeatureKeysWithState}`]>) {
	const modules = import.meta.glob<{ default?: AnyFeatureBase }>("/src/features/*/index.ts");
	const state = initialState ?? (await waitForSpecificMessage("state", "request_data", "extension")).data;
	const imports = Object.entries(modules).map(async ([path, importFn]) => {
		try {
			const { default: feature } = await importFn();
			if (!feature) return;
			await registry.register(feature, state);
		} catch (e) {
			console.error(`Failed to register feature from ${path}:`, e);
		}
	});
	await Promise.all(imports);
}
