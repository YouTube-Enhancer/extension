import type { AnyFeatureBase } from "@/src/features/_registry/types";

import { waitForSpecificMessage } from "@/src/utils/messaging";

import { registry } from "./featureRegistry";
/**
 * Register all features for runtime.
 * Eagerly imports each feature and registers it with the registry.
 * Uses default export
 */
export async function registerAllFeatures() {
	const modules = import.meta.glob<{ default?: AnyFeatureBase }>("/src/features/*/index.ts", { eager: true });
	const { data: state } = await waitForSpecificMessage("state", "request_data", "extension");
	for (const path in modules) {
		const { [path]: featureModule } = modules;
		const feature = featureModule?.default;
		if (!feature) continue;
		try {
			await registry.register(feature, state);
		} catch (e) {
			console.error(`Failed to register feature from ${path}:`, e);
		}
	}
}
