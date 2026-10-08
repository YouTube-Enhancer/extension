import type {
	AnyFeatureBase,
	CoreFeatureKeys,
	FeatureKeys,
	FeatureKeysWithState
} from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { featurePlayerManager } from "@/src/features/_registry/featurePlayerManager";
import { hasState } from "@/src/features/_registry/featureRegistryCore";

import type { featureConfigManager } from "./featureConfigManager";
import type { featureStateManager } from "./featureStateManager";

import { FeatureManagerBase } from "./featureManagerBase";

/** Feature id accepted by the Disposer API (registry features plus core features). */
export type DisposerKey = CoreFeatureKeys | FeatureKeys;

/** Stable name for a named disposer; registering the same name replaces the previous fn. */
export type DisposerName = string;

/** Named disposers per feature. A map keeps same-name registrations idempotent across re-enables. */
const featureDisposers = new Map<DisposerKey, Map<DisposerName, () => void>>();

export class FeatureLifecycleManager extends FeatureManagerBase {
	constructor(
		private stateManager: typeof featureStateManager,
		private configManager: typeof featureConfigManager
	) {
		super();
	}

	async configChange<K extends FeatureKeys>(feature: AnyFeatureBase, config: configuration[K]) {
		if (!hasOnConfigChange(feature)) return;
		await this.safelyExecute<void>(
			feature.id,
			"onConfigChange",
			async () => {
				if (hasState(feature))
					return await feature.onConfigChange(
						this.configManager.getLast(feature.id) ?? feature.defaults,
						this.stateManager.getStateAPI(feature.id)
					);
				await feature.onConfigChange(config);
			},
			{ shouldRethrow: true }
		);
	}

	async disableFeature<K extends FeatureKeys>(feature: AnyFeatureBase, config: configuration[K]) {
		/**
		 * Abort stale retries before onDisable runs; a restore retry that onDisable itself queues is
		 * deliberate post-disable work and must survive the teardown, so no cleanup runs after it.
		 * Disposers always run after onDisable (or when there is no onDisable), even if onDisable throws.
		 */
		featurePlayerManager.cleanup(feature.id);
		try {
			if (!hasOnDisable(feature)) return;
			await this.safelyExecute<void>(
				feature.id,
				"onDisable",
				async () => {
					if (hasState(feature))
						return await feature.onDisable(
							this.configManager.getLast(feature.id) ?? feature.defaults,
							this.stateManager.getStateAPI(feature.id)
						);
					await feature.onDisable(config);
				},
				{ shouldRethrow: true }
			);
		} finally {
			runFeatureDisposers(feature.id);
		}
	}

	async enableFeature<K extends FeatureKeys>(feature: AnyFeatureBase, config: configuration[K]) {
		if (!hasOnEnable(feature)) return;
		await this.safelyExecute<void>(
			feature.id,
			"onEnable",
			async () => {
				if (hasState(feature))
					return await feature.onEnable(
						this.configManager.getLast(feature.id) ?? feature.defaults,
						this.stateManager.getStateAPI(feature.id)
					);
				await feature.onEnable(config);
			},
			{ shouldRethrow: true }
		);
	}

	async initFeature<K extends FeatureKeys>(feature: AnyFeatureBase, config: configuration[K]) {
		if (!hasOnInit(feature)) return;
		await this.safelyExecute<void>(
			feature.id,
			"onInit",
			async () => {
				if (hasState(feature))
					return await feature.onInit(
						this.configManager.getLast(feature.id) ?? feature.defaults,
						this.stateManager.getStateAPI(feature.id)
					);
				await feature.onInit(config);
			},
			{ shouldRethrow: true }
		);
	}

	async languageChange(feature: AnyFeatureBase) {
		if (!hasOnLanguageChange(feature)) return;
		await this.safelyExecute<void>(
			feature.id,
			"onLanguageChange",
			async () => {
				if (hasState(feature))
					return await feature.onLanguageChange(this.stateManager.getStateAPI(feature.id));
				await feature.onLanguageChange();
			},
			{ shouldRethrow: true }
		);
	}

	async navigateFeature<K extends FeatureKeys>(
		feature: AnyFeatureBase,
		config: configuration[K],
		navigationType: string
	) {
		if (!hasOnNavigate(feature)) return;
		await this.safelyExecute<void>(
			feature.id,
			"onNavigate",
			async () => {
				if (hasState(feature))
					return await feature.onNavigate(
						this.configManager.getLast(feature.id) ?? feature.defaults,
						this.stateManager.getStateAPI(feature.id),
						navigationType
					);
				await feature.onNavigate(config, navigationType);
			},
			{ shouldRethrow: true }
		);
	}

	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "lifecycleManager" as FeatureKeys;
	}
}

/**
 * Abort player retries and run every feature disposer without calling onDisable.
 * Used for page teardown when features are not disabled through the lifecycle path.
 * SPA navigation must not call this: features stay enabled and their disposers must survive.
 */
export function disposeAllFeatureSessions(): void {
	featurePlayerManager.cleanup();
	for (const featureId of [...featureDisposers.keys()]) {
		runFeatureDisposers(featureId);
	}
}

/**
 * Register a named teardown that runs when the feature is disabled.
 * Registering the same name again replaces the previous fn, so re-enabling does not stack listeners.
 * Prefer this over calling playerManager.cleanup / eventManager remove by hand in onDisable.
 */
export function registerFeatureDisposer(
	featureId: DisposerKey,
	name: DisposerName,
	fn: () => void
): void {
	const map = featureDisposers.get(featureId) ?? new Map<DisposerName, () => void>();
	map.set(name, fn);
	featureDisposers.set(featureId, map);
}

/** Remove a named disposer without running it. */
export function removeFeatureDisposer(featureId: DisposerKey, name: DisposerName): void {
	featureDisposers.get(featureId)?.delete(name);
}

function runFeatureDisposers(featureId: DisposerKey): void {
	const map = featureDisposers.get(featureId);
	if (!map) return;
	for (const [name, fn] of map) {
		try {
			fn();
		} catch (error) {
			console.error(`[featureDisposers] Cleanup "${name}" failed for ${featureId}:`, error);
		}
	}
	featureDisposers.delete(featureId);
}

const hasOnInit = hasMethod("onInit");
const hasOnEnable = hasMethod("onEnable");
const hasOnDisable = hasMethod("onDisable");
const hasOnConfigChange = hasMethod("onConfigChange");
const hasOnLanguageChange = hasMethod("onLanguageChange");
const hasOnNavigate = hasMethod("onNavigate");
type FunctionKeys<T> = {
	[K in keyof T]-?: NonNullable<T[K]> extends (...args: any[]) => any ? K : never;
}[keyof T];
type MethodType<T, K extends keyof T> =
	NonNullable<T[K]> extends (...args: infer A) => infer R ? (...args: A) => R : never;
function hasMethod<K extends FunctionKeys<AnyFeatureBase>>(method: K) {
	return function (feature: AnyFeatureBase): feature is AnyFeatureBase & {
		[P in K]-?: MethodType<AnyFeatureBase, K>;
	} {
		return Object.hasOwn(feature, method) && typeof feature[method] === "function";
	};
}
