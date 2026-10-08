import type {
	AnyFeatureBase,
	FeatureButton,
	FeatureKeys,
	FeatureKeysWithState
} from "@/src/features/_registry/types";
import type { PlacementOutcome } from "@/src/features/buttonController/buttonPlacement";
import type { configuration, Nullable } from "@/src/types";

import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { featureNavigationManager } from "@/src/features/_registry/featureNavigationManager";
import {
	buttonPlacement,
	placementNeedsRecheck
} from "@/src/features/buttonController/buttonPlacement";
import { applyFeatureConfig } from "@/src/ui/configProvider";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";
import { readinessSelectors } from "@/src/utils/dom/readiness";

import type { FeatureLifecycleManager } from "./featureLifecycleManager";
import type { FeatureRegistry } from "./featureRegistry";

import { FeatureManagerBase } from "./featureManagerBase";
import { resolveEnabled } from "./featureRegistryCore";

type PageEnableCandidate = {
	config: configuration[FeatureKeys];
	feature: AnyFeatureBase;
	hasButtons: boolean;
	priority: number;
};

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
	 * Defer lifecycle to a later phase (navigation pipeline places buttons once after
	 * onNavigate; cold load records the transition and runs hooks in a second pass).
	 */
	skipLifecycle?: boolean;
};

export class FeatureOrchestrator extends FeatureManagerBase {
	/** Debounce handle for the placement rebind that follows a player-controls re-render. */
	private controlsRebindTimer: Nullable<ReturnType<typeof setTimeout>> = null;
	private controlsRebindUnsubscribe: Nullable<UnsubscribeFromDomMutations> = null;
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
	 * Transitions recorded when lifecycle is deferred (skipLifecycle). A later pass runs only
	 * the hooks for these so enable/disable is not executed twice.
	 */
	private phaseOneTransitions = new Map<FeatureKeys, PhaseOneTransition>();
	/** One deferred placement recheck timer per feature; replaced on re-schedule, cleared on disable/nav. */
	private placementRechecks = new Map<FeatureKeys, ReturnType<typeof setTimeout>>();
	private sortedFeaturesCache: Nullable<AnyFeatureBase[]> = null;
	private sortedFeaturesCacheDirty = true;
	private updatingFeatures = new Set<FeatureKeys>();

	constructor(
		private registry: FeatureRegistry,
		private lifecycle: FeatureLifecycleManager
	) {
		super();
	}

	/** Clear every deferred placement recheck (navigation, page teardown). */
	cancelAllPlacementRechecks(): void {
		for (const timer of this.placementRechecks.values()) {
			clearTimeout(timer);
		}
		this.placementRechecks.clear();
	}

	async disableAll() {
		try {
			this.cancelAllPlacementRechecks();
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

	/**
	 * Enable registered features that match the current page gate and are not enabled yet.
	 * Button features are placed first in one priority-ordered batch (readiness once, then
	 * feature by feature so same-feature buttons stay adjacent). Lifecycle runs after placement.
	 * Off-page features stay disabled until navigation re-evaluates them.
	 */
	async enableRegisteredForCurrentPage(): Promise<void> {
		this.ensureControlsRebindWatcher();
		const toEnable: PageEnableCandidate[] = [];

		for (const feature of this.getFeaturesSortedByPriority()) {
			if (this.featureEnabledState.get(feature.id) === true) continue;
			const config = featureConfigManager.getLastOr(feature.id, feature.defaults);
			const enabled = resolveEnabled(config);
			const depsMet = featureNavigationManager.areDependenciesMet(feature);
			if (!enabled || !depsMet) continue;
			toEnable.push({
				config,
				feature,
				hasButtons: this.registry.hasButtons(feature, feature.id),
				priority: metadataRegistry.get(feature.id)?.priority ?? 0
			});
		}
		if (!toEnable.length) return;

		const buttonItems = toEnable
			.filter((item) => item.hasButtons)
			.map((item) => {
				const feature = item.feature as AnyFeatureBase & {
					buttons?: FeatureButton<FeatureKeys>[];
					id: FeatureKeys;
				};
				return {
					buttons: feature.buttons ?? [],
					canEnable: true,
					config: item.config,
					featureId: feature.id,
					priority: item.priority
				};
			});
		await buttonPlacement.placeFeaturesByPriority(buttonItems);

		for (const { config, feature, hasButtons } of toEnable) {
			await this.lifecycle.initFeature(feature, config);
			// Buttons already placed in the priority batch; lifecycle only here.
			await this.updateFeatureEnabledState(feature.id, true, config, {
				skipButtons: hasButtons
			});
		}
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
		buttonPlacement.invalidateCache();
	}

	isFeatureEnabled(id: FeatureKeys): boolean {
		return this.featureEnabledState.get(id) ?? false;
	}

	async notifyConfigChange<K extends FeatureKeys>(id: K, config: configuration[K]) {
		const feature = this.registry.getFeature(id);
		if (!feature) return;
		const prevConfig = featureConfigManager.getLast(id);
		applyFeatureConfig(id, config);
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
		if (!this.registry.getFeature(id)) {
			/**
			 * A lazy chunk may still be importing. Keep the fresh config so the late-enable at
			 * registration applies this change instead of a stale pre-write snapshot; the
			 * feature enables as soon as its chunk lands.
			 */
			applyFeatureConfig(id, config);
			return;
		}
		await this.notifyConfigChange(id, config);
		await this.updateFeatureEnabledState(id, enabled, config);
	}

	/** Schedule the deferred 3s placement recheck for a feature (explicit callers). */
	requestPlacementRecheck<K extends FeatureKeys>(id: K, config: configuration[K]): void {
		const feature = this.registry.getFeature(id);
		if (!feature) return;
		this.schedulePlacementRecheck(feature, id, config);
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
				} else if (!state.canEnable) {
					this.cancelPlacementRecheck(id);
				}
				return;
			}
			this.featureEnabledState.set(id, state.canEnable);
			if (!state.canEnable) {
				this.cancelPlacementRecheck(id);
			}
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
			// Recheck is outcome-driven in applyButtonPlacement; do not schedule unconditionally here.
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
		const config = featureConfigManager.getLast(id) ?? (feature.defaults as configuration[K]);
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
	): Promise<PlacementOutcome[]> {
		const feature = this.registry.getFeature(id);
		if (!feature) return [];
		return this.applyButtonPlacement(feature, id, config, canEnable);
	}

	protected override getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "featureOrchestrator" as FeatureKeys;
	}

	private applyButtonPlacement<K extends FeatureKeys>(
		feature: AnyFeatureBase,
		id: K,
		config: configuration[K],
		canEnable: boolean
	): Promise<PlacementOutcome[]> {
		if (!this.registry.hasButtons(feature, id)) {
			this.cancelPlacementRecheck(id);
			return Promise.resolve([]);
		}
		return this.safelyExecute<PlacementOutcome[]>(
			id,
			"enable",
			async () => {
				if (!feature.buttons?.length) return [];
				return buttonPlacement.placeFeatureButtons({
					buttons: feature.buttons,
					canEnable,
					config,
					featureId: id
				});
			},
			{
				fallback: [],
				subPhase: "buttons"
			}
		)
			.then((outcomes) => outcomes ?? [])
			.then((outcomes) => {
				// Outcome-driven recheck: only deferred / missing buttons get a 3s pass.
				// Semantics live on buttonPlacement; this module only schedules.
				if (!canEnable || !placementNeedsRecheck(outcomes)) {
					this.cancelPlacementRecheck(id);
				} else {
					this.schedulePlacementRecheck(feature, id, config);
				}
				return outcomes;
			});
	}

	private cancelPlacementRecheck(id: FeatureKeys): void {
		const timer = this.placementRechecks.get(id);
		if (timer !== undefined) {
			clearTimeout(timer);
			this.placementRechecks.delete(id);
		}
	}

	/**
	 * The player controls re-render on live streams and whenever YouTube rebuilds the player
	 * chrome, destroying already-placed feature buttons. Config changes and the one-shot
	 * post-enable recheck cannot see a re-render that happens later - by then nothing runs a
	 * placement pass again and the button stays gone for the rest of the page session. Watch
	 * the controls (re)appearances instead; the per-button DOM check in buttonPlacement turns
	 * each pass into a re-add only for the buttons that are actually missing.
	 */
	private ensureControlsRebindWatcher() {
		if (this.controlsRebindUnsubscribe) return;
		this.controlsRebindUnsubscribe = subscribeToDomMutations(
			`${readinessSelectors.playerControlsLeft}, ${readinessSelectors.playerControlsRight}`,
			() => {
				// Placement itself appends buttons inside the controls, so debounce to keep those
				// additions - and bursts of re-render mutations - from re-triggering the pass.
				if (this.controlsRebindTimer) clearTimeout(this.controlsRebindTimer);
				this.controlsRebindTimer = setTimeout(() => {
					this.controlsRebindTimer = null;
					void this.rebindButtonsAfterControlsRender();
				}, 300);
			}
		);
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
	 * placement can fire against a target that then vanishes again. One shared timer per feature; only
	 * scheduled when placement outcomes include deferred or missing buttons.
	 */
	private schedulePlacementRecheck<K extends FeatureKeys>(
		feature: AnyFeatureBase,
		id: K,
		_config: configuration[K]
	) {
		this.cancelPlacementRecheck(id);
		const timer = setTimeout(() => {
			this.placementRechecks.delete(id);
			if (this.featureEnabledState.get(id) !== true) return;
			if (!this.registry.getFeature(id)) return;
			// Re-read the config instead of using the one captured when this recheck was scheduled: a
			// config change in the meantime (a button placement move, for one) would otherwise be undone
			// by the stale pass seconds later, and nothing would move the button back.
			const config = featureConfigManager.getLast(id) ?? (feature.defaults as configuration[K]);
			void this.applyButtonPlacement(feature, id, config, true);
		}, 3000);
		this.placementRechecks.set(id, timer);
	}
}
