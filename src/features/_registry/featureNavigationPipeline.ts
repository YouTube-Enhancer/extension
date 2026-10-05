import type { AnyFeatureBase, FeatureKeys } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { resolveEnabled } from "@/src/features/_registry/featureRegistryCore";
import { reseedForNavigation } from "@/src/ui/configProvider";

import type { FeatureRegistry } from "./featureRegistry";

type NavigationPipelineDeps = {
	registry: FeatureRegistry;
	signature: string;
};

type PreviousConfigs = Map<FeatureKeys, configuration[FeatureKeys]>;

/**
 * One SPA navigation used to re-run enableAll over every feature, then walk every feature again
 * through updateFeatureOnNavigation (which could place buttons a second time). This module diffs
 * page + config and only runs the work that actually changed.
 *
 * Same-feature buttons stay sequential: each feature is fully processed before the next starts.
 */
export async function runNavigationPipeline(deps: NavigationPipelineDeps): Promise<void> {
	const { registry, signature } = deps;
	const previousConfigs = capturePreviousConfigs(registry);
	const configs = await reseedForNavigation();
	registry.orchestrator.invalidateButtonCache();

	const features = registry.orchestrator.getFeaturesSortedByPriority();
	for (const feature of features) {
		await applyNavigationForFeature(registry, feature, configs, previousConfigs, signature);
	}
}

async function applyNavigationForFeature(
	registry: FeatureRegistry,
	feature: AnyFeatureBase,
	configs: configuration,
	previousConfigs: PreviousConfigs,
	signature: string
): Promise<void> {
	const { id } = feature;
	const config = configs[id] ?? feature.defaults;
	const enabled = resolveEnabled(config);
	const depsMet = registry.navigationManager.areDependenciesMet(feature);
	const canEnable = enabled && depsMet;
	const wasEnabled = registry.orchestrator.isFeatureEnabled(id);
	const previousConfig = previousConfigs.get(id);
	const configChanged = featureConfigManager.hasChanged(previousConfig, config);
	const stateChanged = canEnable !== wasEnabled;

	if (!canEnable && !wasEnabled && !configChanged) return;

	if (stateChanged || configChanged) {
		if (canEnable) {
			// Lifecycle + config only; buttons are placed once after onNavigate below.
			await registry.orchestrator.updateFeatureEnabledState(id, canEnable, config, {
				skipButtons: true
			});
		} else {
			// Disable path must remove buttons and run onDisable.
			await registry.orchestrator.updateFeatureEnabledState(id, canEnable, config);
		}
	}

	if (!canEnable) return;

	await registry.lifecycleManager.navigateFeature(feature, config, signature);
	// One placement pass per feature per navigation. handleButtonPlacement keeps same-feature
	// buttons sequential so they stay adjacent.
	await registry.orchestrator.verifyButtonPlacement(id, config, true);
}

function capturePreviousConfigs(registry: FeatureRegistry): PreviousConfigs {
	const previousConfigs: PreviousConfigs = new Map();
	for (const feature of registry.getAll()) {
		previousConfigs.set(feature.id, featureConfigManager.getLastOr(feature.id, feature.defaults));
	}
	return previousConfigs;
}

export type { NavigationPipelineDeps, PreviousConfigs };
