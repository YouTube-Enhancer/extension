import type { FeatureKeys } from "@/src/features/_registry/types";
import type { configuration, Nullable } from "@/src/types";

import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { resolveEnabled } from "@/src/features/_registry/featureRegistryCore";
import { waitForSpecificMessage } from "@/src/utils/messaging";

/**
 * Single in-page store for extension configuration.
 *
 * Seeded from the content script at bootstrap, re-seeded on SPA navigation, and kept in sync
 * by storage-change broadcasts. Core slices (deepDarkCSS, featureMenu, onScreenDisplay) and
 * per-feature last configs are derived from the same snapshot so callers stop answering
 * "what is the current config?" through three different adapters.
 */

type ConfigProviderState = {
	core: Partial<CoreSlices>;
	snapshot: Nullable<configuration>;
};

type CoreSliceName = "deepDarkCSS" | "featureMenu" | "onScreenDisplay";

type CoreSlices = Pick<configuration, CoreSliceName>;

type ReconcileAfterPageLoadedOptions = {
	getAll: () => { defaults: configuration[FeatureKeys]; id: FeatureKeys }[];
	reconcile: (
		id: FeatureKeys,
		config: configuration[FeatureKeys],
		enabled: boolean
	) => Promise<void>;
};

const state: ConfigProviderState = {
	core: {},
	snapshot: null
};

export async function fetchOptions(): Promise<configuration> {
	const {
		data: { options }
	} = await waitForSpecificMessage("options", "request_data", "content");
	return options;
}

export function getDeepDarkCSSConfig(): Nullable<CoreSlices["deepDarkCSS"]> {
	const {
		core: { deepDarkCSS }
	} = state;
	return deepDarkCSS ?? null;
}

export function getFeatureMenuConfig(): Nullable<CoreSlices["featureMenu"]> {
	const {
		core: { featureMenu }
	} = state;
	return featureMenu ?? null;
}

export function getOnScreenDisplayConfig(): Nullable<CoreSlices["onScreenDisplay"]> {
	const {
		core: { onScreenDisplay }
	} = state;
	return onScreenDisplay ?? null;
}

export function getSnapshot(): Nullable<configuration> {
	return state.snapshot;
}

export function hasSeeded(): boolean {
	return state.snapshot !== null;
}

/**
 * Catch-up after the content script starts forwarding storage changes. Seeds from a fresh
 * options read, then reconciles any feature whose config the orchestrator has not applied yet.
 */
export async function reconcileAfterPageLoaded(
	options: ReconcileAfterPageLoadedOptions
): Promise<void> {
	const currentOptions = await fetchOptions();
	seed(currentOptions);
	for (const feature of options.getAll()) {
		const { id } = feature;
		const { [id]: current } = currentOptions;
		if (!current) continue;
		const last = featureConfigManager.getLastOr(id, feature.defaults);
		if (!featureConfigManager.hasChanged(last, current)) continue;
		await options.reconcile(id, current, resolveEnabled(current));
	}
}

/** Navigation re-read: fetch current options, seed the provider, return the snapshot. */
export async function reseedForNavigation(): Promise<configuration> {
	return seed(await fetchOptions());
}

export function seed(snapshot: configuration): configuration {
	state.snapshot = snapshot;
	applyCoreSlicesFromSnapshot(snapshot);
	applyFeatureConfigsFromSnapshot(snapshot);
	return snapshot;
}

export function setCoreConfigs(partial: Partial<CoreSlices>): void {
	const { core } = state;
	const { deepDarkCSS, featureMenu, onScreenDisplay } = partial;
	if (deepDarkCSS !== undefined) core.deepDarkCSS = deepDarkCSS;
	if (featureMenu !== undefined) core.featureMenu = featureMenu;
	if (onScreenDisplay !== undefined) core.onScreenDisplay = onScreenDisplay;
	mergeSnapshotWithCore(partial);
}

export function setDeepDarkCSSConfig(config: CoreSlices["deepDarkCSS"]): void {
	const { core } = state;
	core.deepDarkCSS = config;
	mergeSnapshotWithCore({ deepDarkCSS: config });
}

export function setFeatureMenuConfig(config: CoreSlices["featureMenu"]): void {
	const { core } = state;
	core.featureMenu = config;
	mergeSnapshotWithCore({ featureMenu: config });
}

export function setOnScreenDisplayConfig(config: CoreSlices["onScreenDisplay"]): void {
	const { core } = state;
	core.onScreenDisplay = config;
	mergeSnapshotWithCore({ onScreenDisplay: config });
}

function applyCoreSlicesFromSnapshot(snapshot: configuration): void {
	state.core = {
		deepDarkCSS: snapshot.deepDarkCSS,
		featureMenu: snapshot.featureMenu,
		onScreenDisplay: snapshot.onScreenDisplay
	};
}

function applyFeatureConfigsFromSnapshot(snapshot: configuration): void {
	for (const { id } of metadataRegistry.getAll()) {
		const { [id]: config } = snapshot;
		if (config === undefined) continue;
		featureConfigManager.setLast(id, config);
	}
}

function mergeSnapshotWithCore(partial: Partial<CoreSlices>): void {
	if (!state.snapshot) return;
	const { snapshot } = state;
	state.snapshot = {
		...snapshot,
		...(partial.deepDarkCSS !== undefined ? { deepDarkCSS: partial.deepDarkCSS } : {}),
		...(partial.featureMenu !== undefined ? { featureMenu: partial.featureMenu } : {}),
		...(partial.onScreenDisplay !== undefined ? { onScreenDisplay: partial.onScreenDisplay } : {})
	};
}
