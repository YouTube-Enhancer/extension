import type { AnyFeatureBase, FeatureKeys } from "@/src/features/_registry/types";
import type { PlacementOutcome } from "@/src/features/buttonController/buttonPlacement";
import type { configuration } from "@/src/types";

import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { resolveEnabled } from "@/src/features/_registry/featureRegistryCore";
import { reseedForNavigation } from "@/src/ui/configProvider";

type NavigationPipelineDeps = {
	areDependenciesMet: (feature: AnyFeatureBase) => boolean;
	getFeatures: () => AnyFeatureBase[];
	invalidateButtonCache: () => void;
	isFeatureEnabled: (id: FeatureKeys) => boolean;
	navigateFeature: (
		feature: AnyFeatureBase,
		config: configuration[FeatureKeys],
		signature: string
	) => Promise<void>;
	signature: string;
	updateFeatureEnabledState: (
		id: FeatureKeys,
		enabled: boolean,
		config: configuration[FeatureKeys],
		options?: { skipButtons?: boolean }
	) => Promise<void>;
	/**
	 * Places buttons and returns outcomes. Placement schedules the deferred 3s recheck
	 * only when an outcome is deferred or not landed.
	 */
	verifyButtonPlacement: (
		id: FeatureKeys,
		config: configuration[FeatureKeys],
		canEnable: boolean
	) => Promise<PlacementOutcome[]>;
};

type PreviousConfigs = Map<FeatureKeys, configuration[FeatureKeys]>;

/**
 * One SPA navigation used to re-run enableAll over every feature, then walk every feature again
 * through updateFeatureOnNavigation (which could place buttons a second time). This module diffs
 * page + config and only runs the work that actually changed.
 *
 * Placement outcomes decide recheck work: unchanged + landed buttons do not schedule a 3s re-pass.
 * Same-feature buttons stay sequential: each feature is fully processed before the next starts.
 */
export async function runNavigationPipeline(deps: NavigationPipelineDeps): Promise<void> {
	const previousConfigs = capturePreviousConfigs(deps.getFeatures());
	const configs = await reseedForNavigation();
	deps.invalidateButtonCache();

	for (const feature of deps.getFeatures()) {
		await applyNavigationForFeature(deps, feature, configs, previousConfigs);
	}
}

async function applyNavigationForFeature(
	deps: NavigationPipelineDeps,
	feature: AnyFeatureBase,
	configs: configuration,
	previousConfigs: PreviousConfigs
): Promise<void> {
	const { id } = feature;
	const config = configs[id] ?? feature.defaults;
	const enabled = resolveEnabled(config);
	const depsMet = deps.areDependenciesMet(feature);
	const canEnable = enabled && depsMet;
	const wasEnabled = deps.isFeatureEnabled(id);
	const previousConfig = previousConfigs.get(id);
	const configChanged = featureConfigManager.hasChanged(previousConfig, config);
	const stateChanged = canEnable !== wasEnabled;

	if (!canEnable && !wasEnabled && !configChanged) return;

	if (stateChanged || configChanged) {
		if (canEnable) {
			// Lifecycle + config only; buttons are placed once after onNavigate below.
			await deps.updateFeatureEnabledState(id, canEnable, config, { skipButtons: true });
		} else {
			// Disable path must remove buttons and run onDisable.
			await deps.updateFeatureEnabledState(id, canEnable, config);
		}
	}

	if (!canEnable) return;

	await deps.navigateFeature(feature, config, deps.signature);
	// One placement pass per feature per navigation. handleButtonPlacement keeps same-feature
	// buttons sequential so they stay adjacent. Outcomes are returned; applyButtonPlacement
	// schedules the deferred 3s recheck only when a button is deferred or missing.
	await deps.verifyButtonPlacement(id, config, true);
}

function capturePreviousConfigs(features: AnyFeatureBase[]): PreviousConfigs {
	const previousConfigs: PreviousConfigs = new Map();
	for (const feature of features) {
		previousConfigs.set(feature.id, featureConfigManager.getLastOr(feature.id, feature.defaults));
	}
	return previousConfigs;
}

export type { NavigationPipelineDeps, PreviousConfigs };
