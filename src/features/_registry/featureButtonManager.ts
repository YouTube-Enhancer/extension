import type {
	AnyFeatureBase,
	FeatureButton,
	FeatureKeys,
	FeatureKeysWithState
} from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { buttonPlacement } from "@/src/features/buttonController/buttonPlacement";

import { FeatureManagerBase } from "./featureManagerBase";

/**
 * Thin adapter between the feature orchestrator and the button placement module.
 * Placement decisions, readiness, tracked state, and container-cache invalidation
 * live in `buttonPlacement`.
 */
class FeatureButtonManager extends FeatureManagerBase {
	constructor() {
		super();
	}

	public async handleButtonPlacement<K extends FeatureKeys>(
		feature: AnyFeatureBase & { buttons?: FeatureButton<K>[]; id: K },
		config: configuration[K],
		canEnable: boolean
	) {
		if (!feature.buttons?.length) return;
		await buttonPlacement.placeFeatureButtons({
			buttons: feature.buttons,
			canEnable,
			config,
			featureId: feature.id
		});
	}

	invalidateCache() {
		buttonPlacement.invalidateCache();
	}

	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "buttonManager" as FeatureKeys;
	}
}
export const featureButtonManager = new FeatureButtonManager();
