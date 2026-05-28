import type {
	FeatureBaseWithState,
	FeatureKeys,
	FeatureKeysWithState,
	FeatureState,
	FeatureStateAPI,
	FeatureStateKeys
} from "@/src/features/_registry/types";
import type { MiniPlayerRect } from "@/src/features/miniPlayer/controller";
import type { VideoHistoryStorage } from "@/src/features/videoHistory/types";

import { sendContentOnlyMessage } from "@/src/utils/messaging";

import { FeatureManagerBase } from "./featureManagerBase";

class FeatureStateManager extends FeatureManagerBase {
	private featureInternalState = new Map<FeatureKeysWithState, FeatureState[FeatureStateKeys]>();

	constructor() {
		super();
	}

	getFeatureState<K extends FeatureKeysWithState>(id: K): FeatureState[FeatureStateKeys] | undefined {
		return this.featureInternalState.get(id);
	}
	getStateAPI<K extends FeatureKeysWithState>(id: K): FeatureStateAPI<K> {
		return {
			getState: () => {
				const state = this.getFeatureState(id);
				if (!state) throw new Error(`State not initialized for ${id}`);
				return state as FeatureState[`state:${K}`];
			},
			setState: (updater) => {
				const prev = this.getStateAPI(id).getState();
				const next = updater(prev);
				this.updateFeatureState(id, next);
				this.emitStateUpdate(id, next);
			}
		};
	}

	public async hydrateState(
		feature: FeatureBaseWithState<FeatureKeysWithState>,
		state: FeatureState[`state:${FeatureKeysWithState}`]
	): Promise<FeatureState[`state:${FeatureKeysWithState}`]> {
		const defaultState = this.cloneInitialState(feature);
		const persistState = this.shouldPersistState(feature);
		const validatedStorageState = persistState ? this.validateState(feature, state) : undefined;
		const migrated = persistState ? await this.migrateFromLocalStorage(feature.id) : undefined;
		// Merge priority: defaults (lowest) < migrated legacy state < storage (highest - last wins)
		const merged = {
			...defaultState,
			...(migrated ?? {}),
			...(validatedStorageState ?? {})
		};
		return this.validateState(feature, merged) ?? defaultState;
	}
	updateFeatureState<K extends FeatureKeysWithState>(id: K, state: FeatureState[`state:${K}`]) {
		this.featureInternalState.set(id, state);
	}
	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "stateManager" as FeatureKeysWithState;
	}
	private cloneInitialState<K extends FeatureKeysWithState>(feature: FeatureBaseWithState<K>) {
		if (!feature.state) return {} as FeatureState[`state:${K}`];

		try {
			return structuredClone(feature.state);
		} catch {
			return JSON.parse(JSON.stringify(feature.state)) as FeatureState[`state:${K}`];
		}
	}
	private emitStateUpdate<K extends FeatureKeysWithState>(id: K, state: FeatureState[`state:${K}`]) {
		sendContentOnlyMessage("featureStateUpdate", { id, state });
	}
	private async migrateFromLocalStorage<K extends FeatureKeysWithState>(id: K): Promise<FeatureState[`state:${K}`] | undefined> {
		const result = await this.safelyExecute(
			id,
			"migrateFromLocalStorage",
			// eslint-disable-next-line @typescript-eslint/require-await
			async () => {
				switch (id) {
					case "miniPlayer": {
						const rectRaw = localStorage.getItem("yte_mini_player_state");
						const manualRaw = localStorage.getItem("yte_mini_player_manual_override");
						if (!rectRaw && !manualRaw) return undefined;
						return {
							manualOverride: manualRaw ? Boolean(JSON.parse(manualRaw)) : false,
							rect: rectRaw ? (JSON.parse(rectRaw) as MiniPlayerRect) : null
						} as FeatureState[`state:${K}`];
					}
					case "playerSpeed": {
						const speed = localStorage.getItem("playerSpeed");
						if (!speed) return undefined;
						return {
							playbackSpeed: Number(speed)
						} as FeatureState[`state:${K}`];
					}
					case "videoHistory": {
						const raw = localStorage.getItem("videoHistory");
						if (!raw) return undefined;
						return {
							storage: JSON.parse(raw) as VideoHistoryStorage
						} as FeatureState[`state:${K}`];
					}
					default:
						return undefined;
				}
			},
			{ fallback: undefined }
		);

		// Convert null (from safelyExecute error fallback) to undefined
		// to prevent errors when spreading the result in hydrateState
		// and to maintain consistency with expected return type where
		// undefined means "no migration result"
		return result === null ? undefined : result;
	}
	private shouldPersistState<K extends FeatureKeysWithState>(feature: FeatureBaseWithState<K>) {
		return feature.persistState ?? false;
	}
	private validateState<K extends FeatureKeysWithState, S extends object = FeatureState[`state:${K}`]>(
		feature: FeatureBaseWithState<K>,
		state: unknown
	): S | undefined {
		// No state provided
		if (!state) return undefined;
		// If a state schema exists, validate using it
		if (feature.stateSchema) {
			try {
				// parse will already enforce the shape, so the cast is safe
				return feature.stateSchema.parse(state) as S;
			} catch (err) {
				this.logErrorToTracker(`validateState for feature ${feature.id}`, err);
				console.group(`[FeatureRegistry] State validation failed for feature "${feature.id}"`);
				console.error(err);
				console.warn(`[FeatureRegistry] Invalid state for feature "${feature.id}":`, state);
				console.groupEnd();
				return undefined;
			}
		}
		// If no schema, ensure it's an object and return as-is
		if (typeof state === "object" && state !== null) return state as S;
		// Invalid state type
		console.warn(`[FeatureRegistry] Invalid state type for feature "${feature.id}": expected object but got`, typeof state);
		return undefined;
	}
}
export const featureStateManager = new FeatureStateManager();
