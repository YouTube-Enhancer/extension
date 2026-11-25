import type { AnyFeatureBase, FeatureButton, FeatureKeys } from "@/src/features/_registry/types";
import type { PlacementOutcome } from "@/src/features/buttonController/buttonPlacement";
import type { configuration, Nullable } from "@/src/types";

import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { resolveEnabled } from "@/src/features/_registry/featureRegistryCore";
import { buttonPlacement } from "@/src/features/buttonController/buttonPlacement";
import { reseedForNavigation } from "@/src/ui/configProvider";
import { refinePageTypeFromPlayer } from "@/src/utils/url";
import { getNavigationSignature } from "@/src/utils/url/signature";

type ColdLoadEnablementDeps = {
	areDependenciesMet: (feature: AnyFeatureBase) => boolean;
	ensureControlsRebindWatcher: () => void;
	getFeatures: () => AnyFeatureBase[];
	hasButtons: (feature: AnyFeatureBase, id: FeatureKeys) => boolean;
	initFeature: (feature: AnyFeatureBase, config: configuration[FeatureKeys]) => Promise<void>;
	isFeatureEnabled: (id: FeatureKeys) => boolean;
	updateFeatureEnabledState: (
		id: FeatureKeys,
		enabled: boolean,
		config: configuration[FeatureKeys],
		options?: { skipButtons?: boolean }
	) => Promise<void>;
};

type LiveRefinePipelineDeps = {
	/** Commit the refined signature/page exactly as the navigation manager used to. */
	commitSignature: (signature: string) => void;
	/** Run the navigation pipeline for the refined signature; no-op when unwired. */
	invokePipeline: (signature: string) => Promise<void>;
	/** Snapshot taken before the player round-trip, so a stale refine is detectable. */
	isInitialized: () => boolean;
	/** True while a navigation run holds the queued-drain gate. */
	isNavigating: () => boolean;
	readBaseline: () => { page: Nullable<string>; signature: Nullable<string> };
};
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

type PageEnableCandidate = {
	config: configuration[FeatureKeys];
	feature: AnyFeatureBase;
	hasButtons: boolean;
	priority: number;
};

type PreviousConfigs = Map<FeatureKeys, configuration[FeatureKeys]>;

/**
 * Cold-load enablement — the second door into this module (SPA navigation uses
 * runNavigationPipeline later in this module). The body moved here verbatim from FeatureOrchestrator so the
 * two enablement entries sit beside each other instead of one living in the orchestrator:
 * same work list, same sequence, one home.
 *
 * Sequence (unchanged): arm the controls-rebind watcher → collect page-matching features that
 * are not enabled yet → place their buttons in one priority-ordered batch (menu readiness once,
 * siblings adjacent) → run onInit → enable with buttons skipped, since the batch placed them.
 */
export async function runColdLoadEnablement(deps: ColdLoadEnablementDeps): Promise<void> {
	deps.ensureControlsRebindWatcher();
	const toEnable: PageEnableCandidate[] = [];

	for (const feature of deps.getFeatures()) {
		if (deps.isFeatureEnabled(feature.id)) continue;
		const config = featureConfigManager.getLastOr(feature.id, feature.defaults);
		const enabled = resolveEnabled(config);
		const depsMet = deps.areDependenciesMet(feature);
		if (!enabled || !depsMet) continue;
		toEnable.push({
			config,
			feature,
			hasButtons: deps.hasButtons(feature, feature.id),
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
		await deps.initFeature(feature, config);
		// Buttons already placed in the priority batch; lifecycle only here.
		await deps.updateFeatureEnabledState(feature.id, true, config, {
			skipButtons: hasButtons
		});
	}
}
/**
 * Player-driven live refine: ask the player whether this watch URL is actually live, commit the
 * refined signature, and re-run the navigation pipeline when it moved. Moved here verbatim from
 * FeatureNavigationManager so liveRefine enters through this module beside the cold-load entry
 * rather than sitting next to the navigation gate. The manager keeps only the trigger, the
 * in-flight dedup (liveRefinePromise) and the state the deps read.
 *
 * Ordering vs the queued-drain gate is unchanged: the guard reads `navigating` before and after
 * the player await and never holds it, so a navigation event arriving mid-refine still debounces
 * into processNavigation exactly as before.
 */
export async function runLiveRefinePipeline(deps: LiveRefinePipelineDeps): Promise<void> {
	// A refine that lands mid-pipeline would start a second full navigation pass.
	if (deps.isNavigating()) return;
	const { page: previousPage, signature: previousSignature } = deps.readBaseline();
	const refined = await refinePageTypeFromPlayer();
	if (!refined || refined === previousPage) return;
	if (!deps.isInitialized()) return;
	// Re-check after the player await; a navigation may have started while we waited.
	if (deps.isNavigating()) return;
	const signature = getNavigationSignature();
	if (!signature) return;
	deps.commitSignature(signature);
	if (signature !== previousSignature) await deps.invokePipeline(signature);
}

/**
 * One SPA navigation: reseed config, then walk each feature with a diffed work list
 * (page gate + config change) instead of a full enableAll sweep.
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
