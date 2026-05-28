import type { AnyFeatureBase, FeatureKeys, FeatureKeysWithState } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { hasState } from "@/src/features/_registry/featureRegistry";

import type { featureConfigManager } from "./featureConfigManager";
import type { featureStateManager } from "./featureStateManager";

import { FeatureManagerBase } from "./featureManagerBase";

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
				if (hasState(feature)) return await feature.onConfigChange(this.configManager.getLast(feature.id), this.stateManager.getStateAPI(feature.id));
				await feature.onConfigChange(config);
			},
			{ shouldRethrow: true }
		);
	}

	async disableFeature<K extends FeatureKeys>(feature: AnyFeatureBase, config: configuration[K]) {
		if (!hasOnDisable(feature)) return;
		await this.safelyExecute<void>(
			feature.id,
			"onDisable",
			async () => {
				if (hasState(feature)) return await feature.onDisable(this.configManager.getLast(feature.id), this.stateManager.getStateAPI(feature.id));
				await feature.onDisable(config);
			},
			{ shouldRethrow: true }
		);
	}

	async enableFeature<K extends FeatureKeys>(feature: AnyFeatureBase, config: configuration[K]) {
		if (!hasOnEnable(feature)) return;
		await this.safelyExecute<void>(
			feature.id,
			"onEnable",
			async () => {
				if (hasState(feature)) return await feature.onEnable(this.configManager.getLast(feature.id), this.stateManager.getStateAPI(feature.id));
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
				if (hasState(feature)) return await feature.onInit(this.configManager.getLast(feature.id), this.stateManager.getStateAPI(feature.id));
				await feature.onInit(config);
			},
			{ shouldRethrow: true }
		);
	}

	async navigateFeature<K extends FeatureKeys>(feature: AnyFeatureBase, config: configuration[K], navigationType: string) {
		if (!hasOnNavigate(feature)) return;
		await this.safelyExecute<void>(
			feature.id,
			"onNavigate",
			async () => {
				if (hasState(feature))
					return await feature.onNavigate(this.configManager.getLast(feature.id), this.stateManager.getStateAPI(feature.id), navigationType);
				await feature.onNavigate(config, navigationType);
			},
			{ shouldRethrow: true }
		);
	}

	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "lifecycleManager" as FeatureKeys;
	}
}
const hasOnInit = hasMethod("onInit");
const hasOnEnable = hasMethod("onEnable");
const hasOnDisable = hasMethod("onDisable");
const hasOnConfigChange = hasMethod("onConfigChange");
const hasOnNavigate = hasMethod("onNavigate");
type FunctionKeys<T> = {
	[K in keyof T]-?: NonNullable<T[K]> extends (...args: any[]) => any ? K : never;
}[keyof T];
type MethodType<T, K extends keyof T> = NonNullable<T[K]> extends (...args: infer A) => infer R ? (...args: A) => R : never;
function hasMethod<K extends FunctionKeys<AnyFeatureBase>>(method: K) {
	return function (feature: AnyFeatureBase): feature is AnyFeatureBase & {
		[P in K]-?: MethodType<AnyFeatureBase, K>;
	} {
		return Object.hasOwn(feature, method) && typeof feature[method] === "function";
	};
}
