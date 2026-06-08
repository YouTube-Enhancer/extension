import type { AnyFeatureBase, ButtonTrackedState, FeatureButton, FeatureKeys, FeatureKeysWithState } from "@/src/features/_registry/types";
import type { ButtonPlacement, configuration, FullscreenPlacement, Nullable } from "@/src/types";

import { checkIfFeatureButtonExists, updateTrackedButtonConfig } from "@/src/features/buttonPlacement/utils";

import { FeatureManagerBase } from "./featureManagerBase";

class FeatureButtonManager extends FeatureManagerBase {
	private buttonState = new Map<FeatureKeys, Record<string, ButtonTrackedState>>();
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
		if (!this.buttonState.has(feature.id)) this.buttonState.set(feature.id, {});
		const featureBtnState = this.buttonState.get(feature.id)!;

		for (const btn of feature.buttons) {
			const nextBtnCfg = this.getButtonConfig(config, btn.name);
			const isActive = await this.computeButtonActive(btn, config, canEnable, nextBtnCfg);
			await this.updateButtonPlacement(
				feature.id,
				btn,
				featureBtnState,
				config,
				isActive,
				nextBtnCfg?.placement,
				nextBtnCfg?.fullscreenPlacement ?? "same"
			);
		}
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
		stateMap: Record<string, ButtonTrackedState>,
		config: configuration[K],
		isActive: boolean,
		nextPlacement?: ButtonPlacement,
		nextFullscreenPlacement: FullscreenPlacement = "same"
	) {
		// Create a lock key for this specific button to prevent concurrent updates
		const lockKey = `${id}:${btn.name}`;

		// Wait for any existing update on this button to complete
		if (this.updatingButtonStates.has(lockKey)) {
			await this.updatingButtonStates.get(lockKey)!;
		}

		// Create a promise for this update operation
		const updatePromise = (async () => {
			try {
				const prevState = stateMap[btn.name] ?? {
					enabled: false,
					fullscreenPlacement: "same" as FullscreenPlacement,
					initialized: false,
					placement: undefined
				};
				const wasActive = prevState.initialized && prevState.enabled;
				const moved = prevState.placement !== nextPlacement;
				const fullscreenChanged = prevState.fullscreenPlacement !== nextFullscreenPlacement;

				if (wasActive && (!isActive || moved)) {
					await this.safelyExecute(
						id,
						"buttons:remove",
						async () => {
							await btn.remove(prevState.placement);
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
							const buttonExists = await checkIfFeatureButtonExists(btn.name, nextPlacement ?? "feature_menu");
							if (!buttonExists) {
								await btn.add(config);
							}
						},
						{
							shouldRethrow: true
						}
					);
				}

				stateMap[btn.name] = { enabled: isActive, fullscreenPlacement: nextFullscreenPlacement, initialized: true, placement: nextPlacement };
			} finally {
				// Remove the lock when done
				this.updatingButtonStates.delete(lockKey);
			}
		})();

		// Store the promise so future updates wait for this one
		this.updatingButtonStates.set(lockKey, updatePromise);

		// Wait for this update to complete
		await updatePromise;
	}
}
export const featureButtonManager = new FeatureButtonManager();
