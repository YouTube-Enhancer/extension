import type {
	FeatureButton,
	FeatureKeys,
	FeatureKeysWithState
} from "@/src/features/_registry/types";
import type { ButtonConfigSlice } from "@/src/features/buttonController/resolveButtonConfig";
import type {
	AllButtonNames,
	ButtonPlacement,
	configuration,
	FullscreenPlacement,
	Nullable
} from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { FeatureManagerBase } from "@/src/features/_registry/featureManagerBase";
import {
	checkIfFeatureButtonExists,
	getFeatureButton,
	removeButton
} from "@/src/features/buttonController/ButtonController";
import {
	clearContainerNodes,
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
} from "@/src/features/buttonController/buttonPlacementState";
import { enableFeatureMenuButton } from "@/src/features/buttonController/featureMenu";
import { resolveButtonConfig } from "@/src/features/buttonController/resolveButtonConfig";

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

/** One feature's buttons to place in a priority-ordered batch. */
export type PriorityPlacementItem<K extends FeatureKeys = FeatureKeys> = {
	buttons: FeatureButton<K>[];
	canEnable: boolean;
	config: configuration[K];
	featureId: K;
	/** Lower numbers place first in shared containers (metadata.priority). */
	priority?: number;
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
		clearContainerNodes();
		this.readinessPromise = null;
	}

	/**
	 * Places every button of one feature, sequentially. Same-feature buttons stay adjacent
	 * because the next `add` does not start until the previous one has finished.
	 *
	 * Returns outcomes so callers can skip recheck work when every button is already landed.
	 */
	async placeFeatureButtons<K extends FeatureKeys>(input: {
		buttons: FeatureButton<K>[];
		canEnable: boolean;
		config: configuration[K];
		featureId: K;
	}): Promise<PlacementOutcome[]> {
		const { buttons, canEnable, config, featureId } = input;
		if (!buttons.length) return [];
		if (canEnable && this.allButtonsUnchanged(featureId, buttons, config)) {
			return buttons.map((btn) => ({ detail: "unchanged", landed: true, name: btn.name }));
		}
		await this.ensureReadiness();
		const outcomes: PlacementOutcome[] = [];
		for (const btn of buttons) {
			outcomes.push(await this.placeOneButton(featureId, btn, config, canEnable));
		}
		return outcomes;
	}

	/**
	 * Places buttons for several features in one pass: sort by priority, ensure readiness once,
	 * then place feature by feature. Within a feature, buttons stay sequential so siblings
	 * remain adjacent. Use this for cold-load / page-relevant enable instead of calling
	 * placeFeatureButtons once per feature.
	 */
	async placeFeaturesByPriority(
		items: PriorityPlacementItem[]
	): Promise<Map<FeatureKeys, PlacementOutcome[]>> {
		const results = new Map<FeatureKeys, PlacementOutcome[]>();
		if (!items.length) return results;
		const ordered = [...items].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
		const needsWork = ordered.some(
			(item) =>
				item.canEnable && !this.allButtonsUnchanged(item.featureId, item.buttons, item.config)
		);
		if (needsWork) {
			await this.ensureReadiness();
		}
		for (const item of ordered) {
			const { buttons, canEnable, config, featureId } = item;
			if (!buttons.length) {
				results.set(featureId, []);
				continue;
			}
			if (canEnable && this.allButtonsUnchanged(featureId, buttons, config)) {
				results.set(
					featureId,
					buttons.map((btn) => ({ detail: "unchanged", landed: true, name: btn.name }))
				);
				continue;
			}
			const outcomes: PlacementOutcome[] = [];
			for (const btn of buttons) {
				outcomes.push(await this.placeOneButton(featureId, btn, config, canEnable));
			}
			results.set(featureId, outcomes);
		}
		return results;
	}

	protected override getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "buttonPlacement" as FeatureKeys;
	}

	private allButtonsUnchanged<K extends FeatureKeys>(
		featureId: K,
		buttons: FeatureButton<K>[],
		config: configuration[K]
	): boolean {
		for (const btn of buttons) {
			const nextBtnCfg = resolveButtonConfig(config, featureId, btn.name);
			if (nextBtnCfg?.enabled === false) return false;
			const nextPlacement = nextBtnCfg?.placement;
			const nextFullscreenPlacement = nextBtnCfg?.fullscreenPlacement ?? "same";
			if (!isTrackedButtonLanded(btn.name)) return false;
			if (getTrackedButtonPlacement(btn.name) !== nextPlacement) return false;
			if ((getTrackedButtonFullscreenPlacement(btn.name) ?? "same") !== nextFullscreenPlacement)
				return false;
			const expectedPlacement = nextPlacement ?? "feature_menu";
			if (!checkIfFeatureButtonExists(btn.name, expectedPlacement)) return false;
			if (!getFeatureButton(btn.name)) return false;
		}
		return true;
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
		const nextBtnCfg = resolveButtonConfig(config, featureId, btn.name);
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
				// A player-controls re-render can destroy a placed button while the tracked state
				// still says it is active. Presence at the expected placement - not the tracked flag
				// alone - decides whether an add is needed, so a placement pass that runs after the
				// re-render actually re-adds the button instead of skipping it as "already placed".
				const expectedPlacement = nextPlacement ?? prevPlacement ?? "feature_menu";
				const domPresent = checkIfFeatureButtonExists(btn.name, expectedPlacement);

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

				// The add path also covers a re-render that destroyed the button while tracked
				// state still said active: !domPresent re-adds it instead of skipping.
				if (isActive && (!wasActive || moved || fullscreenChanged || !domPresent)) {
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
