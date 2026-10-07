import type {
	AnyFeatureBase,
	FeatureButton,
	FeatureKeys,
	FeatureKeysWithState
} from "@/src/features/_registry/types";
import type {
	PlacementOutcome,
	PriorityPlacementItem
} from "@/src/features/buttonController/buttonPlacement";
import type { configuration } from "@/src/types";

import { buttonPlacement } from "@/src/features/buttonController/buttonPlacement";

import { FeatureManagerBase } from "./featureManagerBase";

/**
 * Thin adapter between the feature orchestrator and the button placement module.
 * Placement decisions, readiness, tracked state, and container-cache invalidation
 * live in `buttonPlacement`. Returns outcomes so callers can skip recheck work.
 */
class FeatureButtonManager extends FeatureManagerBase {
	constructor() {
		super();
	}

	public async handleButtonPlacement<K extends FeatureKeys>(
		feature: AnyFeatureBase & { buttons?: FeatureButton<K>[]; id: K },
		config: configuration[K],
		canEnable: boolean
	): Promise<PlacementOutcome[]> {
		if (!feature.buttons?.length) return [];
		return buttonPlacement.placeFeatureButtons({
			buttons: feature.buttons,
			canEnable,
			config,
			featureId: feature.id
		});
	}

	invalidateCache() {
		buttonPlacement.invalidateCache();
	}

	/**
	 * Priority-ordered batch: sort features by priority, ensure readiness once, then
	 * place feature by feature. Same-feature buttons stay sequential (adjacent in the DOM).
	 */
	public placeFeaturesByPriority(
		items: PriorityPlacementItem[]
	): Promise<Map<FeatureKeys, PlacementOutcome[]>> {
		return buttonPlacement.placeFeaturesByPriority(items);
	}

	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "buttonManager" as FeatureKeys;
	}
}
export const featureButtonManager = new FeatureButtonManager();
