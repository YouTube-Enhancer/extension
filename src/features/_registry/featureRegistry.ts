import type { AnyFeatureBase, FeatureKeys, FeatureKeysWithState, FeatureState } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { FeatureLifecycleManager } from "@/src/features/_registry/featureLifecycleManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { featureNavigationManager, type NavigationEventType } from "@/src/features/_registry/featureNavigationManager";
import { featurePlayerManager } from "@/src/features/_registry/featurePlayerManager";

import type { FeatureButton } from "./types";

import { FeatureManagerBase } from "./featureManagerBase";
import { FeatureOrchestrator } from "./featureOrchestrator";
import { hasState, isFeature } from "./featureRegistryCore";
import { featureStateManager } from "./featureStateManager";

export class FeatureRegistry extends FeatureManagerBase {
	public configManager = featureConfigManager;
	public readonly lifecycleManager = new FeatureLifecycleManager(featureStateManager, featureConfigManager);
	navigationListener?: () => void;
	public navigationManager = featureNavigationManager;
	public orchestrator = new FeatureOrchestrator(this);
	public playerManager = featurePlayerManager;
	public stateManager = featureStateManager;
	private features = new Map<FeatureKeys, AnyFeatureBase>();
	destroyNavigationListener() {
		this.navigationManager.destroyListener();
	}
	async disableAll() {
		await this.orchestrator.disableAll();
	}
	async enableAll(options: Partial<configuration>) {
		await this.orchestrator.enableAll(options);
	}
	getAll() {
		return Array.from(this.features.values());
	}
	getFeature<K extends FeatureKeys>(id: K) {
		return this.features.get(id);
	}
	hasButtons<K extends FeatureKeys>(feature: AnyFeatureBase, id: K): feature is AnyFeatureBase & { buttons: FeatureButton<K>[]; id: K } {
		return feature.id === id && Array.isArray((feature as { buttons?: unknown }).buttons);
	}
	async initialize(cb: (navigationType: string, eventType: NavigationEventType) => Promise<void>) {
		await this.navigationManager.initialize(async (navigationType, eventType) => {
			this.playerManager.cleanup();
			await this.safelyExecute<void>("navigationCallback", "navigate", () => cb(navigationType, eventType), { subPhase: "callback" });
			for (const feature of this.orchestrator.getFeaturesSortedByPriority()) {
				await this.orchestrator.updateFeatureOnNavigation(feature.id, navigationType);
			}
		});
	}
	async notifyConfigChange<K extends FeatureKeys>(id: K, config: configuration[K]) {
		await this.orchestrator.notifyConfigChange(id, config);
	}
	async register(feature: AnyFeatureBase, initialState: Record<FeatureKeysWithState, FeatureState[`state:${FeatureKeysWithState}`]>) {
		if (!isFeature(feature)) return;
		if (this.features.has(feature.id)) return;
		this.features.set(feature.id, feature);
		this.orchestrator.setFeatureEnabled(feature.id, false);
		if (feature.schemaInput) this.setSchema(feature.id);
		if (hasState(feature)) {
			if (feature.stateSchemaInput) this.setStateSchema(feature.id);
			const state = await this.safelyExecute<FeatureState[`state:${FeatureKeysWithState}`]>(feature.id, "init:state", async () => {
				return featureStateManager.hydrateState(feature, initialState[feature.id]);
			});
			if (state !== null && state !== undefined) {
				featureStateManager.updateFeatureState(feature.id, state);
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
		await this.orchestrator.updateFeatureEnabledState(id, enabled, config);
	}
	protected override getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "featureRegistry" as FeatureKeys;
	}
}
export const registry = new FeatureRegistry();
