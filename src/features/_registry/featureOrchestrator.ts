import type { AnyFeatureBase, FeatureKeys, FeatureKeysWithState } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { featureButtonManager } from "@/src/features/_registry/featureButtonManager";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { featureNavigationManager } from "@/src/features/_registry/featureNavigationManager";
import { cleanupRegistry } from "@/src/utils/cleanup";

import type { FeatureRegistry } from "./featureRegistry";

import { FeatureManagerBase } from "./featureManagerBase";
import { resolveEnabled } from "./featureRegistryCore";

export class FeatureOrchestrator extends FeatureManagerBase {
	private enableAllPromise: null | Promise<void> = null;
	private featureEnabledState = new Map<FeatureKeys, boolean>();
	private sortedFeaturesCache: AnyFeatureBase[] | null = null;
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
				for (const feature of featuresByPriority) {
					const featureConfig = options[feature.id] ?? feature.defaults;
					featureConfigManager.setLast(feature.id, featureConfig);
				}
				for (const feature of featuresByPriority) {
					const { [feature.id]: featureConfig } = options;
					if (!featureConfig) continue;
					await this.registry.lifecycleManager.initFeature(feature, featureConfig);
					const enabledResult = await this.safelyExecute<boolean>(
						feature.id,
						"init:dependencies",
						async () => {
							return Promise.resolve(resolveEnabled(featureConfig));
						},
						{ fallback: false, shouldRethrow: true }
					);
					const enabled = enabledResult ?? false;
					await this.safelyExecute(feature.id, "init", async () => await this.updateFeatureEnabledState(feature.id, enabled, featureConfig), {
						subPhase: "enable"
					});
				}

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
			(await this.safelyExecute<boolean>(
				id,
				"config:dependencies",
				async () => Promise.resolve(featureNavigationManager.areDependenciesMet(feature)),
				{
					fallback: false
				}
			)) ?? false;
		const resolved =
			(await this.safelyExecute<boolean>(
				id,
				"config:dependencies",
				async () => {
					return Promise.resolve(resolveEnabled(config));
				},
				{ fallback: false }
			)) ?? false;
		const canEnable = resolved && depsMet;
		if (!this.registry.hasButtons(feature, id)) return;
		await this.safelyExecute<void>(id, "config:buttons", async () => {
			await featureButtonManager.handleButtonPlacement(feature, config, canEnable);
		});
	}

	setFeatureEnabled(id: FeatureKeys, enabled: boolean): void {
		this.sortedFeaturesCacheDirty = true;
		this.featureEnabledState.set(id, enabled);
	}

	async updateFeatureEnabledState<K extends FeatureKeys>(id: K, enabled: boolean, config: configuration[K]) {
		const feature = this.registry.getFeature(id);
		if (!feature) return;
		if (this.updatingFeatures.has(id)) return;
		this.updatingFeatures.add(id);
		try {
			const prevEnabled = this.featureEnabledState.get(id) ?? false;
			const prevConfig = featureConfigManager.getLast(id);
			const depsMet =
				(await this.safelyExecute<boolean>(id, "enable", async () => Promise.resolve(featureNavigationManager.areDependenciesMet(feature)), {
					subPhase: "dependencies"
				})) ?? false;
			const canEnable = enabled && depsMet;
			const hasEnabledChanged = prevEnabled !== canEnable;
			const hasConfigChanged =
				(await this.safelyExecute<boolean>(id, "config", async () => Promise.resolve(featureConfigManager.hasChanged(prevConfig, config)), {
					subPhase: "dependencies"
				})) ?? false;
			if (!hasEnabledChanged && !hasConfigChanged) return;
			this.featureEnabledState.set(id, canEnable);
			if (this.registry.hasButtons(feature, id)) {
				await this.safelyExecute(id, "enable", async () => featureButtonManager.handleButtonPlacement(feature, config, canEnable), {
					subPhase: "buttons"
				});
			}
			if (canEnable && !prevEnabled) {
				await this.safelyExecute(id, "enable", async () => this.registry.lifecycleManager.enableFeature(feature, config), { subPhase: "lifecycle" });
			}
			if (!canEnable && prevEnabled) {
				await this.safelyExecute(id, "disable", async () => this.registry.lifecycleManager.disableFeature(feature, config), {
					subPhase: "lifecycle"
				});
				cleanupRegistry.run(id);
			}
		} finally {
			this.updatingFeatures.delete(id);
		}
	}

	async updateFeatureOnNavigation<K extends FeatureKeys>(id: K, navigationType: string) {
		const feature = this.registry.getFeature(id);
		if (!feature) return;
		const config = featureConfigManager.getLast(id) ?? feature.defaults;
		const isEnabled =
			(await this.safelyExecute<boolean>(id, "navigate", async () => Promise.resolve(resolveEnabled(config)), { subPhase: "dependencies" })) ?? false;
		await this.updateFeatureEnabledState(id, isEnabled, config);
		const isActive = this.featureEnabledState.get(id);
		if (isActive) {
			await this.safelyExecute(id, "navigate", async () => this.registry.lifecycleManager.navigateFeature(feature, config, navigationType), {
				subPhase: "lifecycle"
			});
			if (this.registry.hasButtons(feature, id)) {
				await this.safelyExecute(id, "navigate", async () => featureButtonManager.handleButtonPlacement(feature, config, true), {
					subPhase: "buttons"
				});
			}
		}
	}

	protected override getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "featureOrchestrator" as FeatureKeys;
	}
}
