import type { AnyFeatureBase, FeatureButton, FeatureKeys, FeatureKeysWithState } from "@/src/features/_registry/types";
import type { ButtonPlacement, configuration, FullscreenPlacement, Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { checkIfFeatureButtonExists, removeFeatureButton } from "@/src/features/buttonController";
import {
	getTrackedButtonEnabled,
	getTrackedButtonFullscreenPlacement,
	getTrackedButtonInitialized,
	getTrackedButtonPlacement,
	setTrackedButtonEnabled,
	setTrackedButtonInitialized,
	setTrackedButtonPlacement,
	updateTrackedButtonConfig,
	updateTrackedButtonLabelResolver
} from "@/src/features/buttonController/buttonState";
import { invalidateContainerCache } from "@/src/features/buttonController/containerTracking";

import { FeatureManagerBase } from "./featureManagerBase";

class FeatureButtonManager extends FeatureManagerBase {
	private updatingButtonStates = new Map<string, Promise<void>>();

	constructor() {
		super();
	}

	public async handleButtonPlacement<K extends FeatureKeys>(
		feature: AnyFeatureBase & { buttons?: FeatureButton<K>[]; id: K },
		config: configuration[K],
		canEnable: boolean
	) {
		if (!feature.buttons?.length) return;

		for (const btn of feature.buttons) {
			const nextBtnCfg = this.getButtonConfig(config, btn.name);
			const isActive = await this.computeButtonActive(btn, config, canEnable, nextBtnCfg);
			await this.updateButtonPlacement(feature.id, btn, config, isActive, nextBtnCfg?.placement, nextBtnCfg?.fullscreenPlacement ?? "same");
		}
	}

	invalidateCache() {
		invalidateContainerCache();
	}

	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "buttonManager" as FeatureKeys;
	}

	private async computeButtonActive<K extends FeatureKeys>(
		btn: FeatureButton<K>,
		config: configuration[K],
		canEnable: boolean,
		nextBtnCfg: Nullable<{ enabled?: boolean; fullscreenPlacement?: FullscreenPlacement; placement?: string }>
	): Promise<boolean> {
		const passesCondition = typeof btn.shouldRender === "function" ? await btn.shouldRender(config) : true;
		return canEnable && (nextBtnCfg?.enabled ?? true) && passesCondition;
	}

	private getButtonConfig<K extends FeatureKeys>(
		cfg: configuration[K] | undefined,
		name: string
	): Nullable<{ enabled?: boolean; fullscreenPlacement?: FullscreenPlacement; placement?: ButtonPlacement }> {
		if (!cfg) return null;
		if ("buttons" in cfg) {
			const {
				buttons: { [name]: btnCfg }
			} = cfg as { buttons: Record<string, { enabled?: boolean; fullscreenPlacement?: FullscreenPlacement; placement?: ButtonPlacement }> };
			return btnCfg ?? null;
		}
		if ("button" in cfg)
			return (cfg as { button?: { enabled?: boolean; fullscreenPlacement?: FullscreenPlacement; placement?: ButtonPlacement } }).button ?? null;
		return null;
	}

	private async updateButtonPlacement<K extends FeatureKeys>(
		id: K,
		btn: FeatureButton<K>,
		config: configuration[K],
		isActive: boolean,
		nextPlacement?: ButtonPlacement,
		nextFullscreenPlacement: FullscreenPlacement = "same"
	) {
		const lockKey = `${id}:${btn.name}`;

		if (this.updatingButtonStates.has(lockKey)) {
			await this.updatingButtonStates.get(lockKey)!;
		}

		const updatePromise = (async () => {
			try {
				const wasActive = getTrackedButtonInitialized(btn.name) && getTrackedButtonEnabled(btn.name);
				const prevPlacement = getTrackedButtonPlacement(btn.name);
				const moved = prevPlacement !== nextPlacement;
				const prevFullscreenPlacement = getTrackedButtonFullscreenPlacement(btn.name) ?? "same";
				const fullscreenChanged = prevFullscreenPlacement !== nextFullscreenPlacement;

				if (wasActive && (!isActive || moved)) {
					await this.safelyExecute(
						id,
						"buttons:remove",
						async () => {
							if (btn.remove) {
								await btn.remove(prevPlacement);
							} else {
								removeFeatureButton(btn.name, prevPlacement);
								eventManager.removeEventListeners(id);
								await btn.onRemove?.(prevPlacement);
							}
						},
						{
							shouldRethrow: true
						}
					);
				}

				if (isActive && (!wasActive || moved || fullscreenChanged)) {
					await this.safelyExecute(
						id,
						"buttons:add",
						async () => {
							if (fullscreenChanged && !moved && wasActive) {
								updateTrackedButtonConfig(btn.name, nextFullscreenPlacement);
							}
							if (!wasActive) {
								await btn.add(config);
							} else {
								const buttonExists = await checkIfFeatureButtonExists(btn.name, nextPlacement ?? "feature_menu");
								if (!buttonExists) {
									await btn.add(config);
								}
							}
							if (btn.labelResolver) {
								updateTrackedButtonLabelResolver(btn.name, btn.labelResolver);
							}
						},
						{
							shouldRethrow: true
						}
					);
				}

				setTrackedButtonEnabled(btn.name, isActive);
				setTrackedButtonInitialized(btn.name, true);
				if (nextPlacement) setTrackedButtonPlacement(btn.name, nextPlacement);
			} finally {
				this.updatingButtonStates.delete(lockKey);
			}
		})();

		this.updatingButtonStates.set(lockKey, updatePromise);
		await updatePromise;
	}
}
export const featureButtonManager = new FeatureButtonManager();
