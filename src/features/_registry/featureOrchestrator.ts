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

import type { FeatureLifecycleManager } from "./featureLifecycleManager";
import type { FeatureRegistry } from "./featureRegistry";

import { FeatureManagerBase } from "./featureManagerBase";
import { resolveEnabled } from "./featureRegistryCore";

type PhaseOneTransition = {
	canEnable: boolean;
	config: configuration[FeatureKeys];
	feature: AnyFeatureBase;
	/** False once lifecycle has run (Phase 2 or a concurrent full update). */
	lifecyclePending: boolean;
	prevEnabled: boolean;
};

type UpdateFeatureEnabledStateOptions = {
	skipButtons?: boolean;
	/**
	 * Phase 1 of enableAll: resolve + place buttons only. Lifecycle is deferred to Phase 2
	 * via the recorded transition so enable/disable hooks are not run twice.
	 */
	skipLifecycle?: boolean;
};

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
	/**
	 * Transitions recorded during enableAll Phase 1. Phase 2 runs only the lifecycle for these,
	 * so a clean cold load no longer re-resolves every feature in a parallel no-op pass.
	 */
	private phaseOneTransitions = new Map<FeatureKeys, PhaseOneTransition>();
	private sortedFeaturesCache: Nullable<AnyFeatureBase[]> = null;
	private sortedFeaturesCacheDirty = true;
	private updatingFeatures = new Set<FeatureKeys>();

	constructor(
		private registry: FeatureRegistry,
		private lifecycle: FeatureLifecycleManager
	) {
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

				// Phase 1: Sequential — init, resolve, place buttons per feature.
				// Same-feature buttons stay adjacent in the DOM. Lifecycle is not run here.
				const transitions = await this.phaseInitAndButtons(featuresByPriority, options);

				// Phase 2: Parallel — run lifecycle only for transitions Phase 1 recorded.
				await this.phaseLifecycleHooks(transitions);

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
			await this.lifecycle.configChange(feature, config);
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
		options?: UpdateFeatureEnabledStateOptions
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
			if (!state.hasChanged) {
				// The config is unchanged, but the DOM may not be: the player controls re-render
				// on live streams and can destroy an already-placed button. Placement verification
				// still runs so the button is re-added instead of staying lost until the next
				// config change.
				if (state.canEnable && !options?.skipButtons) {
					await this.applyButtonPlacement(feature, id, config, state.canEnable);
				}
				return;
			}
			this.featureEnabledState.set(id, state.canEnable);
			if (!options?.skipButtons) {
				await this.applyButtonPlacement(feature, id, config, state.canEnable);
			}
			if (options?.skipLifecycle) {
				this.phaseOneTransitions.set(id, {
					canEnable: state.canEnable,
					config,
					feature,
					lifecyclePending: true,
					prevEnabled: state.prevEnabled
				});
				return;
			}
			await this.executeLifecycleTransition(
				feature,
				id,
				config,
				state.canEnable,
				state.prevEnabled
			);
			if (state.canEnable && !options?.skipButtons) {
				this.schedulePlacementRecheck(feature, id, config);
			}
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
				async () => this.lifecycle.navigateFeature(feature, config, navigationType),
				{
					subPhase: "lifecycle"
				}
			);
			await this.applyButtonPlacement(feature, id, config, true);
		}
	}

	/** Public placement entry for the navigation pipeline (one pass per feature). */
	async verifyButtonPlacement<K extends FeatureKeys>(
		id: K,
		config: configuration[K],
		canEnable: boolean
	) {
		const feature = this.registry.getFeature(id);
		if (!feature) return;
		await this.applyButtonPlacement(feature, id, config, canEnable);
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
		const pending = this.phaseOneTransitions.get(id);
		if (pending) pending.lifecyclePending = false;
		if (canEnable && !prevEnabled) {
			await this.safelyExecute(
				id,
				"enable",
				async () => this.lifecycle.enableFeature(feature, config),
				{ subPhase: "lifecycle" }
			);
		}
		if (!canEnable && prevEnabled) {
			await this.safelyExecute(
				id,
				"disable",
				async () => this.lifecycle.disableFeature(feature, config),
				{
					subPhase: "lifecycle"
				}
			);
		}
	}

	private async phaseInitAndButtons(features: AnyFeatureBase[], options: Partial<configuration>) {
		this.phaseOneTransitions.clear();
		for (const feature of features) {
			const { [feature.id]: featureConfig } = options;
			if (!featureConfig) continue;
			await this.lifecycle.initFeature(feature, featureConfig);
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
			// Resolve + place buttons only. Lifecycle runs in Phase 2 from the recorded transition.
			// The sequential await keeps same-feature buttons adjacent in the DOM.
			await this.updateFeatureEnabledState(feature.id, enabled, featureConfig, {
				skipLifecycle: true
			});
		}
		return Array.from(this.phaseOneTransitions.values());
	}

	private async phaseLifecycleHooks(transitions: PhaseOneTransition[]) {
		const CONCURRENCY_GROUP = 0;
		const lifecyclePromises = transitions
			.filter((transition) => transition.lifecyclePending)
			.map(({ canEnable, config, feature, prevEnabled }) =>
				this.safelyExecute(
					feature.id,
					"enable",
					async () => {
						// A concurrent full update may have already run lifecycle for this feature.
						const stillPending = this.phaseOneTransitions.get(feature.id)?.lifecyclePending;
						if (stillPending === false) return;
						await this.executeLifecycleTransition(
							feature,
							feature.id,
							config,
							canEnable,
							prevEnabled
						);
						if (canEnable) {
							this.schedulePlacementRecheck(feature, feature.id, config);
						}
					},
					{
						concurrencyGroup: CONCURRENCY_GROUP,
						subPhase: "enable"
					}
				)
			);
		await Promise.allSettled(lifecyclePromises);
		this.phaseOneTransitions.clear();
	}
	private async rebindButtonsAfterControlsRender() {
		for (const feature of this.registry.getAll()) {
			if (this.featureEnabledState.get(feature.id) !== true) continue;
			if (!this.registry.hasButtons(feature, feature.id)) continue;
			const config = featureConfigManager.getLast(feature.id) ?? feature.defaults;
			await this.applyButtonPlacement(feature, feature.id, config, true);
		}
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
	/**
	 * Placement can lose to the player controls re-rendering right after the button is placed, and a deferred
	 * placement can fire against a target that then vanishes again. Re-check once shortly after an enable and
	 * re-place when the button is gone; the enabled-state check keeps a disabled feature from coming back.
	 */
	private schedulePlacementRecheck<K extends FeatureKeys>(
		feature: AnyFeatureBase,
		id: K,
		_config: configuration[K]
	) {
		setTimeout(() => {
			if (this.featureEnabledState.get(id) !== true) return;
			if (!this.registry.getFeature(id)) return;
			// Re-read the config instead of using the one captured when this recheck was scheduled: a
			// config change in the meantime (a button placement move, for one) would otherwise be undone
			// by the stale pass seconds later, and nothing would move the button back.
			const config = featureConfigManager.getLast(id) ?? feature.defaults;
			void this.applyButtonPlacement(feature, id, config, true);
		}, 3000);
	}
}
