import type {
    PlayerRetryConfig,
    PlayerRetryKey,
    PlayerTask
} from "@/src/features/_registry/featurePlayerManager";
import type {
    AnyFeatureBase,
    FeatureKeys,
    FeatureKeysWithState,
    FeatureState,
    FeatureStateAPI
} from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { FeatureLifecycleManager } from "@/src/features/_registry/featureLifecycleManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { featureNavigationManager } from "@/src/features/_registry/featureNavigationManager";
import { runNavigationPipeline } from "@/src/features/_registry/featureNavigationPipeline";
import { featurePlayerManager } from "@/src/features/_registry/featurePlayerManager";

import type { FeatureButton } from "./types";

import { FeatureManagerBase } from "./featureManagerBase";
import { FeatureOrchestrator } from "./featureOrchestrator";
import { hasState, isFeature, resolveEnabled } from "./featureRegistryCore";
import { featureStateManager } from "./featureStateManager";

/**
 * Public registry surface for features, lifecycle wiring, and devtools.
 * Managers stay private; callers use the facades below instead of reaching into
 * orchestrator / lifecycleManager / playerManager / stateManager objects.
 */
export class FeatureRegistry extends FeatureManagerBase {
	private readonly configManager = featureConfigManager;
	private features = new Map<FeatureKeys, AnyFeatureBase>();
	private readonly lifecycleManager = new FeatureLifecycleManager(
		featureStateManager,
		featureConfigManager
	);
	private readonly navigationManager = featureNavigationManager;
	private readonly orchestrator: FeatureOrchestrator;
	private readonly playerManager = featurePlayerManager;
	private readonly stateManager = featureStateManager;

	constructor() {
		super();
		this.orchestrator = new FeatureOrchestrator(this, this.lifecycleManager);
	}

	cleanupPlayerRetry(featureId?: PlayerRetryKey): void {
		this.playerManager.cleanup(featureId);
	}

	destroyNavigationListener() {
		this.navigationManager.destroyListener();
	}
	async disableAll() {
		await this.orchestrator.disableAll();
	}
	async enableAll(options: Partial<configuration>) {
		await this.orchestrator.enableAll(options);
	}

	executeWithRetries(
		featureId: PlayerRetryKey,
		tasks: PlayerTask[],
		taskNames: string[],
		config?: PlayerRetryConfig
	): Promise<boolean[]> {
		return this.playerManager.executeWithRetries(featureId, tasks, taskNames, config);
	}

	getAll() {
		return Array.from(this.features.values());
	}

	getConfig<K extends FeatureKeys>(id: K): configuration[K] {
		return this.configManager.getLast(id);
	}

	getConfigOr<K extends FeatureKeys>(id: K, fallback: configuration[K]): configuration[K] {
		return this.configManager.getLastOr(id, fallback);
	}

	getFeature<K extends FeatureKeys>(id: K) {
		return this.features.get(id);
	}

	getFeaturesSortedByPriority(): AnyFeatureBase[] {
		return this.orchestrator.getFeaturesSortedByPriority();
	}

	getFeatureState<K extends FeatureKeysWithState>(id: K) {
		return this.stateManager.getFeatureState(id);
	}

	getStateAPI<K extends FeatureKeysWithState>(id: K): FeatureStateAPI<K> {
		return this.stateManager.getStateAPI(id);
	}

	hasButtons<K extends FeatureKeys>(
		feature: AnyFeatureBase,
		id: K
	): feature is AnyFeatureBase & { buttons: FeatureButton<K>[]; id: K } {
		return feature.id === id && Array.isArray((feature as { buttons?: unknown }).buttons);
	}
	/**
	 * Wires SPA navigation to the config reseed + per-feature diff pipeline.
	 * Callers do not pass a callback; all navigation work lives in the pipeline.
	 */
	initialize() {
		this.navigationManager.initialize(async (navigationType) => {
			this.playerManager.cleanup();
			await this.safelyExecute<void>(
				"navigationCallback",
				"navigate",
				() =>
					runNavigationPipeline({
						areDependenciesMet: (feature) => this.navigationManager.areDependenciesMet(feature),
						getFeatures: () => this.orchestrator.getFeaturesSortedByPriority(),
						invalidateButtonCache: () => this.orchestrator.invalidateButtonCache(),
						isFeatureEnabled: (id) => this.orchestrator.isFeatureEnabled(id),
						navigateFeature: (feature, config, signature) =>
							this.lifecycleManager.navigateFeature(feature, config, signature),
						signature: navigationType,
						updateFeatureEnabledState: (id, enabled, config, options) =>
							this.orchestrator.updateFeatureEnabledState(id, enabled, config, options),
						verifyButtonPlacement: (id, config, canEnable) =>
							this.orchestrator.verifyButtonPlacement(id, config, canEnable)
					}),
				{ subPhase: "pipeline" }
			);
		});
	}

	invalidateButtonCache(): void {
		this.orchestrator.invalidateButtonCache();
	}

	isFeatureEnabled(id: FeatureKeys): boolean {
		return this.orchestrator.isFeatureEnabled(id);
	}

	async notifyConfigChange<K extends FeatureKeys>(id: K, config: configuration[K]) {
		await this.orchestrator.notifyConfigChange(id, config);
	}

	async notifyLanguageChange() {
		for (const feature of this.getAll()) {
			await this.lifecycleManager.languageChange(feature);
		}
	}

	async reconcileFeature<K extends FeatureKeys>(id: K, config: configuration[K], enabled: boolean) {
		await this.orchestrator.reconcileFeature(id, config, enabled);
	}
	async register(
		feature: AnyFeatureBase,
		initialState: Record<FeatureKeysWithState, FeatureState[`state:${FeatureKeysWithState}`]>
	) {
		if (!isFeature(feature)) return;
		if (this.features.has(feature.id)) return;
		this.features.set(feature.id, feature);
		this.orchestrator.setFeatureEnabled(feature.id, false);
		if (feature.schemaInput) this.setSchema(feature.id);
		if (hasState(feature)) {
			if (feature.stateSchemaInput) this.setStateSchema(feature.id);
			const state = await this.safelyExecute<FeatureState[`state:${FeatureKeysWithState}`]>(
				feature.id,
				"init:state",
				async () => {
					return featureStateManager.hydrateState(feature, initialState[feature.id]);
				}
			);
			if (state !== null && state !== undefined) {
				featureStateManager.updateFeatureState(feature.id, state);
			}
		}
		// Late-registered feature (Phase 1/2): enable if registry already initialized
		if (this.navigationManager.isInitialized()) {
			const config = featureConfigManager.getLast(feature.id) ?? feature.defaults;
			const enabled = resolveEnabled(config);
			await this.orchestrator.updateFeatureEnabledState(feature.id, enabled, config);
		}
	}

	setFeatureEnabled(id: FeatureKeys, enabled: boolean): void {
		this.orchestrator.setFeatureEnabled(id, enabled);
	}

	async updateFeatureEnabledState<K extends FeatureKeys>(
		id: K,
		enabled: boolean,
		config: configuration[K]
	) {
		await this.orchestrator.updateFeatureEnabledState(id, enabled, config);
	}

	protected override getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "featureRegistry" as FeatureKeys;
	}

	private setSchema<K extends FeatureKeys>(id: K) {
		const featureMetadata = metadataRegistry.get(id);
		if (!featureMetadata) return;
		const feature = this.getFeature(id);
		if (!feature) return;
		const schema = metadataRegistry.getSchema(id);
		if (!schema) return;
		feature.schema = schema;
	}

	private setStateSchema<K extends FeatureKeysWithState>(id: K) {
		const featureMetadata = metadataRegistry.get(id);
		if (!featureMetadata) return;
		const feature = this.getFeature(id);
		if (!feature) return;
		const schema = metadataRegistry.getStateSchema(id);
		if (!schema) return;
		feature.stateSchema = schema;
	}
}
export const registry = new FeatureRegistry();
