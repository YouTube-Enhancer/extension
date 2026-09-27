import type {
	FeatureBaseWithState,
	FeatureKeys,
	FeatureKeysWithState,
	FeatureState,
	FeatureStateAPI,
	FeatureStateKeys
} from "@/src/features/_registry/types";

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
		const migrated = persistState && feature.migrateFromLocalStorage ? await feature.migrateFromLocalStorage() : undefined;
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
