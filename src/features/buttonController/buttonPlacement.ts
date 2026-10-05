import type {
	FeatureButton,
	FeatureKeys,
	FeatureKeysWithState
} from "@/src/features/_registry/types";
import type { ButtonConfigSlice } from "@/src/features/buttonController/buttonConfig";
import type {
	AllButtonNames,
	ButtonPlacement,
	configuration,
	FullscreenPlacement,
	Nullable
} from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { FeatureManagerBase } from "@/src/features/_registry/featureManagerBase";
import { getButtonConfig } from "@/src/features/buttonController/buttonConfig";
import {
	checkIfFeatureButtonExists,
	getFeatureButton,
	removeButton
} from "@/src/features/buttonController/ButtonController";
import {
	getTrackedButtonEnabled,
	getTrackedButtonFullscreenPlacement,
	getTrackedButtonInitialized,
	getTrackedButtonPlacement,
	isTrackedButtonLanded,
	setTrackedButtonEnabled,
	setTrackedButtonInitialized,
	setTrackedButtonPlacement,
	trackedButtons,
	updateTrackedButtonConfig,
	updateTrackedButtonLabelResolver
} from "@/src/features/buttonController/buttonState";
import { invalidateContainerCache } from "@/src/features/buttonController/containerTracking";
import { enableFeatureMenuButton } from "@/src/features/buttonController/featureMenu";

export type PlacementOutcome = {
	detail: "deferred" | "inactive" | "landed" | "removed" | "unchanged";
	landed: boolean;
	name: AllButtonNames;
};

export type PlacementStateSnapshot = {
	domPresent: AllButtonNames[];
	tracked: {
		enabled: boolean;
		initialized: boolean;
		name: AllButtonNames;
		placement: ButtonPlacement | undefined;
	}[];
};

/**
 * Owns feature-button placement: readiness (menu button + targets), per-button add/remove,
 * tracked state, and the sequential same-feature order that keeps sibling buttons adjacent.
 *
 * Feature modules still supply `btn.add` / `btn.remove` closures (icons, listeners, live guards).
 * This module decides when to call them and records whether the button landed in the DOM.
 */
class ButtonPlacementManager extends FeatureManagerBase {
	private readinessPromise: Nullable<Promise<void>> = null;
	private updatingButtonStates = new Map<string, Promise<void>>();

	describeState(): PlacementStateSnapshot {
		const tracked = Array.from(trackedButtons.entries()).map(([name, info]) => ({
			enabled: info.enabled,
			initialized: info.initialized,
			name,
			placement: info.currentPlacement
		}));
		const domPresent = tracked
			.filter((entry) => !!getFeatureButton(entry.name))
			.map((entry) => entry.name);
		return { domPresent, tracked };
	}

	invalidateCache() {
		// One invalidation path for navigation: container geometry + next-place readiness.
		invalidateContainerCache();
		this.readinessPromise = null;
	}

	/**
	 * Places every button of one feature, sequentially. Same-feature buttons stay adjacent
	 * because the next `add` does not start until the previous one has finished.
	 */
	async placeFeatureButtons<K extends FeatureKeys>(input: {
		buttons: FeatureButton<K>[];
		canEnable: boolean;
		config: configuration[K];
		featureId: K;
	}): Promise<PlacementOutcome[]> {
		const { buttons, canEnable, config, featureId } = input;
		if (!buttons.length) return [];
		await this.ensureReadiness();
		const outcomes: PlacementOutcome[] = [];
		for (const btn of buttons) {
			outcomes.push(await this.placeOneButton(featureId, btn, config, canEnable));
		}
		return outcomes;
	}

	protected override getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "buttonPlacement" as FeatureKeys;
	}

	private computeButtonActive<K extends FeatureKeys>(
		btn: FeatureButton<K>,
		config: configuration[K],
		canEnable: boolean,
		nextBtnCfg: Nullable<ButtonConfigSlice>
	): Promise<boolean> {
		return (async () => {
			const passesCondition =
				typeof btn.shouldRender === "function" ? await btn.shouldRender(config) : true;
			return canEnable && (nextBtnCfg?.enabled ?? true) && passesCondition;
		})();
	}

	/**
	 * Menu readiness once per feature, not once per button. Concurrent callers share one promise.
	 */
	private ensureReadiness(): Promise<void> {
		if (!this.readinessPromise) {
			this.readinessPromise = enableFeatureMenuButton().finally(() => {
				this.readinessPromise = null;
			});
		}
		return this.readinessPromise;
	}

	private async placeOneButton<K extends FeatureKeys>(
		featureId: K,
		btn: FeatureButton<K>,
		config: configuration[K],
		canEnable: boolean
	): Promise<PlacementOutcome> {
		const nextBtnCfg = getButtonConfig(config, btn.name);
		const isActive = await this.computeButtonActive(btn, config, canEnable, nextBtnCfg);
		const nextPlacement = nextBtnCfg?.placement;
		const nextFullscreenPlacement = nextBtnCfg?.fullscreenPlacement ?? "same";
		const wasActiveBefore = isTrackedButtonLanded(btn.name);

		await this.updateButtonPlacement(
			featureId,
			btn,
			config,
			isActive,
			nextPlacement,
			nextFullscreenPlacement
		);

		if (!isActive) {
			return { detail: "removed", landed: false, name: btn.name };
		}
		const landed = !!getFeatureButton(btn.name);
		if (!landed) return { detail: "deferred", landed: false, name: btn.name };
		if (wasActiveBefore && !nextPlacement)
			return { detail: "unchanged", landed: true, name: btn.name };
		return { detail: "landed", landed: true, name: btn.name };
	}

	private async updateButtonPlacement<K extends FeatureKeys>(
		featureId: K,
		btn: FeatureButton<K>,
		config: configuration[K],
		isActive: boolean,
		nextPlacement?: ButtonPlacement,
		nextFullscreenPlacement: FullscreenPlacement = "same"
	) {
		const lockKey = `${featureId}:${btn.name}`;

		const pending = this.updatingButtonStates.get(lockKey);
		if (pending) await pending;

		const updatePromise = (async () => {
			try {
				const wasActive =
					getTrackedButtonInitialized(btn.name) && getTrackedButtonEnabled(btn.name);
				const prevPlacement = getTrackedButtonPlacement(btn.name);
				const moved = prevPlacement !== nextPlacement;
				const prevFullscreenPlacement = getTrackedButtonFullscreenPlacement(btn.name) ?? "same";
				const fullscreenChanged = prevFullscreenPlacement !== nextFullscreenPlacement;

				if (wasActive && (!isActive || moved)) {
					await this.safelyExecute(
						featureId,
						"buttons:remove",
						async () => {
							if (btn.remove) {
								await btn.remove(prevPlacement);
							} else {
								removeButton(btn.name, prevPlacement);
								eventManager.removeEventListeners(featureId);
								await btn.onRemove?.(prevPlacement);
							}
						},
						{ shouldRethrow: true }
					);
				}

				if (isActive && (!wasActive || moved || fullscreenChanged)) {
					await this.safelyExecute(
						featureId,
						"buttons:add",
						async () => {
							if (fullscreenChanged && !moved && wasActive) {
								updateTrackedButtonConfig(btn.name, nextFullscreenPlacement);
							}
							if (!wasActive) {
								await btn.add(config);
							} else {
								const buttonExists = checkIfFeatureButtonExists(
									btn.name,
									nextPlacement ?? "feature_menu"
								);
								if (!buttonExists) {
									await btn.add(config);
								}
							}
							if (btn.labelResolver) {
								updateTrackedButtonLabelResolver(btn.name, btn.labelResolver);
							}
						},
						{ shouldRethrow: true }
					);
				}

				// Only mark the button active when it actually landed in the DOM.
				const landed = isActive && !!getFeatureButton(btn.name);
				setTrackedButtonEnabled(btn.name, landed);
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

export const buttonPlacement = new ButtonPlacementManager();
