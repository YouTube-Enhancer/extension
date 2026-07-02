import type { AnyFeatureBase, FeatureButton, FeatureKeys, FeatureKeysWithState, FeatureState } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { featureButtonManager } from "@/src/features/_registry/featureButtonManager";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { FeatureLifecycleManager } from "@/src/features/_registry/featureLifecycleManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { featureNavigationManager, type NavigationEventType } from "@/src/features/_registry/featureNavigationManager";
import { featurePlayerManager } from "@/src/features/_registry/featurePlayerManager";
import { cleanupRegistry } from "@/src/utils/cleanup";

import { FeatureManagerBase } from "./featureManagerBase";
import { hasState, isFeature, resolveEnabled } from "./featureRegistryCore";
import { featureStateManager } from "./featureStateManager";

export class FeatureRegistry extends FeatureManagerBase {
	public buttonManager = featureButtonManager;
	public configManager = featureConfigManager;
	public stateManager = featureStateManager;
	public lifecycleManager = new FeatureLifecycleManager(this.stateManager, this.configManager);
	navigationListener?: () => void;
	public navigationManager = featureNavigationManager;
	public playerManager = featurePlayerManager;
	private enableAllPromise: null | Promise<void> = null;
	private featureEnabledState = new Map<FeatureKeys, boolean>();
	private features = new Map<FeatureKeys, AnyFeatureBase>();
	private sortedFeaturesCache: AnyFeatureBase[] | null = null;
	private sortedFeaturesCacheDirty = true;
	private updatingFeatures = new Set<FeatureKeys>();
	protected override getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "featureRegistry" as FeatureKeys;
	}
	destroyNavigationListener() {
		this.navigationManager.destroyListener();
	}
	async disableAll() {
		try {
			for (const feature of this.getFeaturesSortedByPriority()) {
				const currentEnabled = this.featureEnabledState.get(feature.id) ?? false;
				const config = this.configManager.getLast(feature.id) ?? feature.defaults;
				if (!currentEnabled) continue;
				await this.updateFeatureEnabledState(feature.id, false, config);
			}
			this.perf.logSummary("disableAll");
		} catch (error) {
			console.error(`Error in disableAll`, error);
		}
	}
	async enableAll(options: Partial<configuration>) {
		// Prevent concurrent enableAll calls using a promise-based lock
		if (this.enableAllPromise) {
			await this.enableAllPromise;
			return;
		}

		this.enableAllPromise = (async () => {
			try {
				const featuresByPriority = this.getFeaturesSortedByPriority();
				for (const feature of featuresByPriority) {
					const featureConfig = options[feature.id] ?? feature.defaults;
					this.configManager.setLast(feature.id, featureConfig);
				}
				for (const feature of featuresByPriority) {
					const { [feature.id]: featureConfig } = options;
					if (!featureConfig) continue;
					await this.lifecycleManager.initFeature(feature, featureConfig);
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
	getAll() {
		return Array.from(this.features.values());
	}
	getFeature<K extends FeatureKeys>(id: K) {
		return this.features.get(id);
	}
	async initialize(cb: (navigationType: string, eventType: NavigationEventType) => Promise<void>) {
		await this.navigationManager.initialize(async (navigationType, eventType) => {
			this.playerManager.cleanup();
			await this.safelyExecute<void>("navigationCallback", "navigate", () => cb(navigationType, eventType), { subPhase: "callback" });
			for (const feature of this.getFeaturesSortedByPriority()) {
				await this.updateFeatureOnNavigation(feature.id, navigationType);
			}
		});
	}
	async notifyConfigChange<K extends FeatureKeys>(id: K, config: configuration[K]) {
		const feature = this.getFeature(id);
		if (!feature) return;
		const prevConfig = this.configManager.getLast(id);
		this.configManager.setLast(id, config);
		if (!this.configManager.hasChanged(prevConfig, config)) return;
		await this.safelyExecute<void>(id, "config:lifecycle", async () => {
			await this.lifecycleManager.configChange(feature, config);
		});
		const depsMet =
			(await this.safelyExecute<boolean>(id, "config:dependencies", async () => Promise.resolve(this.navigationManager.areDependenciesMet(feature)), {
				fallback: false
			})) ?? false;
		const resolvedEnabled =
			(await this.safelyExecute<boolean>(
				id,
				"config:dependencies",
				async () => {
					return Promise.resolve(resolveEnabled(config));
				},
				{ fallback: false }
			)) ?? false;
		const canEnable = resolvedEnabled && depsMet;
		if (!this.hasButtons(feature, id)) return;
		await this.safelyExecute<void>(id, "config:buttons", async () => {
			await this.buttonManager.handleButtonPlacement(feature, config, canEnable);
		});
	}
	async register(feature: AnyFeatureBase, initialState: Record<FeatureKeysWithState, FeatureState[`state:${FeatureKeysWithState}`]>) {
		if (!isFeature(feature)) return;
		if (this.features.has(feature.id)) return;
		this.features.set(feature.id, feature);
		this.featureEnabledState.set(feature.id, false);
		this.sortedFeaturesCacheDirty = true;
		if (feature.schemaInput) this.setSchema(feature.id);
		if (hasState(feature)) {
			if (feature.stateSchemaInput) this.setStateSchema(feature.id);
			const state = await this.safelyExecute<FeatureState[`state:${FeatureKeysWithState}`]>(feature.id, "init:state", async () => {
				return this.stateManager.hydrateState(feature, initialState[feature.id]);
			});
			if (state !== null && state !== undefined) {
				this.stateManager.updateFeatureState(feature.id, state);
			}
		}
	}
	setSchema<K extends FeatureKeys>(id: K) {
		const featureMetadata = metadataRegistry.get(id);
		if (!featureMetadata) return;
		const feature = this.getFeature(id);
		if (!feature) return;
		const schema = metadataRegistry.getSchema(id);
		if (!schema) return;
		feature.schema = schema;
	}
	setStateSchema<K extends FeatureKeysWithState>(id: K) {
		const featureMetadata = metadataRegistry.get(id);
		if (!featureMetadata) return;
		const feature = this.getFeature(id);
		if (!feature) return;
		const schema = metadataRegistry.getStateSchema(id);
		if (!schema) return;
		feature.stateSchema = schema;
	}
	async updateFeatureEnabledState<K extends FeatureKeys>(id: K, enabled: boolean, config: configuration[K]) {
		const feature = this.getFeature(id);
		if (!feature) return;
		if (this.updatingFeatures.has(id)) return;
		this.updatingFeatures.add(id);
		try {
			const prevEnabled = this.featureEnabledState.get(id) ?? false;
			const prevConfig = this.configManager.getLast(id);
			const depsMet =
				(await this.safelyExecute<boolean>(id, "enable", async () => Promise.resolve(this.navigationManager.areDependenciesMet(feature)), {
					subPhase: "dependencies"
				})) ?? false;
			const canEnable = enabled && depsMet;
			const hasEnabledChanged = prevEnabled !== canEnable;
			const hasConfigChanged =
				(await this.safelyExecute<boolean>(id, "config", async () => Promise.resolve(this.configManager.hasChanged(prevConfig, config)), {
					subPhase: "dependencies"
				})) ?? false;
			if (!hasEnabledChanged && !hasConfigChanged) return;
			this.featureEnabledState.set(id, canEnable);
			if (this.hasButtons(feature, id)) {
				await this.safelyExecute(id, "enable", async () => this.buttonManager.handleButtonPlacement(feature, config, canEnable), {
					subPhase: "buttons"
				});
			}
			if (canEnable && !prevEnabled) {
				await this.safelyExecute(id, "enable", async () => this.lifecycleManager.enableFeature(feature, config), { subPhase: "lifecycle" });
			}
			if (!canEnable && prevEnabled) {
				await this.safelyExecute(id, "disable", async () => this.lifecycleManager.disableFeature(feature, config), { subPhase: "lifecycle" });
				cleanupRegistry.run(id);
			}
		} finally {
			this.updatingFeatures.delete(id);
		}
	}
	private getFeaturesSortedByPriority(): AnyFeatureBase[] {
		if (!this.sortedFeaturesCache || this.sortedFeaturesCacheDirty) {
			this.sortedFeaturesCache = Array.from(this.features.values()).sort((a, b) => {
				const priorityA = metadataRegistry.get(a.id)?.priority ?? 0;
				const priorityB = metadataRegistry.get(b.id)?.priority ?? 0;
				return priorityA - priorityB;
			});
			this.sortedFeaturesCacheDirty = false;
		}
		return this.sortedFeaturesCache;
	}
	private hasButtons<K extends FeatureKeys>(feature: AnyFeatureBase, id: K): feature is AnyFeatureBase & { buttons: FeatureButton<K>[]; id: K } {
		return feature.id === id && Array.isArray((feature as { buttons?: unknown }).buttons);
	}
	private async updateFeatureOnNavigation<K extends FeatureKeys>(id: K, navigationType: string) {
		const feature = this.getFeature(id)!;
		const config = this.configManager.getLast(id) ?? feature.defaults;
		const isEnabled =
			(await this.safelyExecute<boolean>(id, "navigate", async () => Promise.resolve(resolveEnabled(config)), { subPhase: "dependencies" })) ?? false;
		await this.updateFeatureEnabledState(id, isEnabled, config);
		const isActive = this.featureEnabledState.get(id);
		if (isActive) {
			await this.safelyExecute(id, "navigate", async () => this.lifecycleManager.navigateFeature(feature, config, navigationType), {
				subPhase: "lifecycle"
			});
			if (this.hasButtons(feature, id)) {
				await this.safelyExecute(id, "navigate", async () => this.buttonManager.handleButtonPlacement(feature, config, true), {
					subPhase: "buttons"
				});
			}
		}
	}
}

export const registry = new FeatureRegistry();
export { hasState, isFeature, isFeatureKey, resolveEnabled } from "./featureRegistryCore";
