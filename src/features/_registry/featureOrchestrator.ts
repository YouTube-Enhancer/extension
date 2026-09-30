import type {
	AnyFeatureBase,
	FeatureKeys,
	FeatureKeysWithState
} from "@/src/features/_registry/types";
import type { configuration, Nullable } from "@/src/types";

import { featureButtonManager } from "@/src/features/_registry/featureButtonManager";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { featureNavigationManager } from "@/src/features/_registry/featureNavigationManager";

import type { FeatureRegistry } from "./featureRegistry";

import { FeatureManagerBase } from "./featureManagerBase";
import { resolveEnabled } from "./featureRegistryCore";

export class FeatureOrchestrator extends FeatureManagerBase {
	private enableAllPromise: Nullable<Promise<void>> = null;
	private featureEnabledState = new Map<FeatureKeys, boolean>();
	/**
	 * The newest request that arrived for a feature while an update of it was in flight. It runs as soon as the
	 * update finishes; dropping it lost settings changed while the page, or a navigation, was still being set up.
	 */
	private pendingUpdates = new Map<
		FeatureKeys,
		{ config: configuration[FeatureKeys]; enabled: boolean }
	>();
	private sortedFeaturesCache: Nullable<AnyFeatureBase[]> = null;
	private sortedFeaturesCacheDirty = true;
	private updatingFeatures = new Set<FeatureKeys>();

	constructor(private registry: FeatureRegistry) {
		super();
	}

	async disableAll() {
		try {
			for (const feature of this.getFeaturesSortedByPriority()) {
				const currentEnabled = this.featureEnabledState.get(feature.id) ?? false;
				const config = featureConfigManager.getLast(feature.id) ?? feature.defaults;
				if (!currentEnabled) continue;
				await this.updateFeatureEnabledState(feature.id, false, config);
			}
			this.perf.logSummary("disableAll");
		} catch (error) {
			console.error(`Error in disableAll`, error);
		}
	}

	async enableAll(options: Partial<configuration>) {
		if (this.enableAllPromise) {
			await this.enableAllPromise;
			return;
		}

		this.enableAllPromise = (async () => {
			try {
				const featuresByPriority = this.getFeaturesSortedByPriority();
				this.cacheFeatureConfigs(featuresByPriority, options);

				// Phase 1: Sequential — resolve enabled state and place buttons per feature.
				// This ensures buttons from the same feature are adjacent in the DOM.
				const featureStates = await this.phaseInitAndButtons(featuresByPriority, options);

				// Phase 2: Parallel — run lifecycle hooks for all features concurrently.
				await this.phaseLifecycleHooks(featureStates);

				this.perf.logSummary("enableAll");
			} finally {
				this.enableAllPromise = null;
			}
		})();

		await this.enableAllPromise;
	}

	getFeaturesSortedByPriority(): AnyFeatureBase[] {
		if (!this.sortedFeaturesCache || this.sortedFeaturesCacheDirty) {
			this.sortedFeaturesCache = this.registry.getAll().sort((a, b) => {
				const priorityA = metadataRegistry.get(a.id)?.priority ?? 0;
				const priorityB = metadataRegistry.get(b.id)?.priority ?? 0;
				return priorityA - priorityB;
			});
			this.sortedFeaturesCacheDirty = false;
		}
		return this.sortedFeaturesCache;
	}

	invalidateButtonCache() {
		featureButtonManager.invalidateCache();
	}

	isFeatureEnabled(id: FeatureKeys): boolean {
		return this.featureEnabledState.get(id) ?? false;
	}

	async notifyConfigChange<K extends FeatureKeys>(id: K, config: configuration[K]) {
		const feature = this.registry.getFeature(id);
		if (!feature) return;
		const prevConfig = featureConfigManager.getLast(id);
		featureConfigManager.setLast(id, config);
		if (!featureConfigManager.hasChanged(prevConfig, config)) return;
		await this.safelyExecute<void>(id, "config:lifecycle", async () => {
			await this.registry.lifecycleManager.configChange(feature, config);
		});
		const depsMet =
			this.safelyExecuteSync<boolean>(
				id,
				"config:dependencies",
				() => featureNavigationManager.areDependenciesMet(feature),
				{
					fallback: false
				}
			) ?? false;
		const resolved =
			this.safelyExecuteSync<boolean>(id, "config:dependencies", () => resolveEnabled(config), {
				fallback: false
			}) ?? false;
		const canEnable = resolved && depsMet;
		await this.applyButtonPlacement(feature, id, config, canEnable);
	}

	async reconcileFeature<K extends FeatureKeys>(id: K, config: configuration[K], enabled: boolean) {
		await this.notifyConfigChange(id, config);
		await this.updateFeatureEnabledState(id, enabled, config);
	}

	setFeatureEnabled(id: FeatureKeys, enabled: boolean): void {
		this.sortedFeaturesCacheDirty = true;
		this.featureEnabledState.set(id, enabled);
	}

	async updateFeatureEnabledState<K extends FeatureKeys>(
		id: K,
		enabled: boolean,
		config: configuration[K],
		options?: { skipButtons?: boolean }
	) {
		const feature = this.registry.getFeature(id);
		if (!feature) return;
		if (this.updatingFeatures.has(id)) {
			this.pendingUpdates.set(id, { config, enabled });
			return;
		}
		this.updatingFeatures.add(id);
		try {
			const state = this.resolveFeatureState(id, feature, enabled, config);
			if (!state.hasChanged) return;
			this.featureEnabledState.set(id, state.canEnable);
			if (!options?.skipButtons) {
				await this.applyButtonPlacement(feature, id, config, state.canEnable);
			}
			await this.executeLifecycleTransition(
				feature,
				id,
				config,
				state.canEnable,
				state.prevEnabled
			);
		} finally {
			this.updatingFeatures.delete(id);
			const pending = this.pendingUpdates.get(id);
			if (pending) {
				this.pendingUpdates.delete(id);
				await this.updateFeatureEnabledState(
					id,
					pending.enabled,
					pending.config as configuration[K],
					options
				);
			}
		}
	}

	async updateFeatureOnNavigation<K extends FeatureKeys>(id: K, navigationType: string) {
		const feature = this.registry.getFeature(id);
		if (!feature) return;
		const config = featureConfigManager.getLast(id) ?? feature.defaults;
		const isEnabled =
			this.safelyExecuteSync<boolean>(id, "navigate", () => resolveEnabled(config), {
				subPhase: "dependencies"
			}) ?? false;
		await this.updateFeatureEnabledState(id, isEnabled, config);
		const isActive = this.featureEnabledState.get(id);
		if (isActive) {
			await this.safelyExecute(
				id,
				"navigate",
				async () => this.registry.lifecycleManager.navigateFeature(feature, config, navigationType),
				{
					subPhase: "lifecycle"
				}
			);
			await this.applyButtonPlacement(feature, id, config, true);
		}
	}

	protected override getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "featureOrchestrator" as FeatureKeys;
	}

	private applyButtonPlacement<K extends FeatureKeys>(
		feature: AnyFeatureBase,
		id: K,
		config: configuration[K],
		canEnable: boolean
	) {
		if (!this.registry.hasButtons(feature, id)) return;
		return this.safelyExecute(
			id,
			"enable",
			async () => featureButtonManager.handleButtonPlacement(feature, config, canEnable),
			{
				subPhase: "buttons"
			}
		);
	}

	private cacheFeatureConfigs(features: AnyFeatureBase[], options: Partial<configuration>) {
		for (const feature of features) {
			const featureConfig = options[feature.id] ?? feature.defaults;
			featureConfigManager.setLast(feature.id, featureConfig);
		}
	}

	private async executeLifecycleTransition<K extends FeatureKeys>(
		feature: AnyFeatureBase,
		id: K,
		config: configuration[K],
		canEnable: boolean,
		prevEnabled: boolean
	) {
		if (canEnable && !prevEnabled) {
			await this.safelyExecute(
				id,
				"enable",
				async () => this.registry.lifecycleManager.enableFeature(feature, config),
				{ subPhase: "lifecycle" }
			);
		}
		if (!canEnable && prevEnabled) {
			await this.safelyExecute(
				id,
				"disable",
				async () => this.registry.lifecycleManager.disableFeature(feature, config),
				{
					subPhase: "lifecycle"
				}
			);
		}
	}

	private async phaseInitAndButtons(features: AnyFeatureBase[], options: Partial<configuration>) {
		const featureStates: {
			config: configuration[FeatureKeys];
			enabled: boolean;
			feature: AnyFeatureBase;
		}[] = [];
		for (const feature of features) {
			const { [feature.id]: featureConfig } = options;
			if (!featureConfig) continue;
			await this.registry.lifecycleManager.initFeature(feature, featureConfig);
			const enabledResult = this.safelyExecuteSync<boolean>(
				feature.id,
				"init:dependencies",
				() => resolveEnabled(featureConfig),
				{
					fallback: false,
					shouldRethrow: true
				}
			);
			const enabled = enabledResult ?? false;
			featureStates.push({ config: featureConfig, enabled, feature });
			await this.updateFeatureEnabledState(feature.id, enabled, featureConfig);
		}
		return featureStates;
	}

	private async phaseLifecycleHooks(
		featureStates: {
			config: configuration[FeatureKeys];
			enabled: boolean;
			feature: AnyFeatureBase;
		}[]
	) {
		const CONCURRENCY_GROUP = 0;
		const lifecyclePromises = featureStates.map(({ config, enabled, feature }) =>
			this.safelyExecute(
				feature.id,
				"init",
				async () =>
					await this.updateFeatureEnabledState(feature.id, enabled, config, { skipButtons: true }),
				{
					concurrencyGroup: CONCURRENCY_GROUP,
					subPhase: "enable"
				}
			)
		);
		await Promise.allSettled(lifecyclePromises);
	}

	private resolveFeatureState<K extends FeatureKeys>(
		id: K,
		feature: AnyFeatureBase,
		enabled: boolean,
		config: configuration[K]
	) {
		const prevEnabled = this.featureEnabledState.get(id) ?? false;
		const prevConfig = featureConfigManager.getLast(id);
		const depsMet =
			this.safelyExecuteSync<boolean>(
				id,
				"enable",
				() => featureNavigationManager.areDependenciesMet(feature),
				{
					subPhase: "dependencies"
				}
			) ?? false;
		const canEnable = enabled && depsMet;
		const hasEnabledChanged = prevEnabled !== canEnable;
		const hasConfigChanged =
			this.safelyExecuteSync<boolean>(
				id,
				"config",
				() => featureConfigManager.hasChanged(prevConfig, config),
				{
					subPhase: "dependencies"
				}
			) ?? false;
		return { canEnable, hasChanged: hasEnabledChanged || hasConfigChanged, prevEnabled };
	}
}
