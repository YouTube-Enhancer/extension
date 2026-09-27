import type { FeatureKeys } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { deepEqual } from "@/src/utils/deepEqual";

class FeatureConfigManager {
	private lastConfig = new Map<FeatureKeys, configuration[FeatureKeys]>();

	getLast<K extends FeatureKeys>(id: K): configuration[K] {
		const cfg = this.lastConfig.get(id);
		if (!cfg) throw new Error(`Config not found for ${id}`);
		return cfg as configuration[K];
	}

	hasChanged<K extends FeatureKeys>(prev: configuration[K] | undefined, next: configuration[K]): boolean {
		return !deepEqual(prev, next);
	}

	setLast<K extends FeatureKeys>(id: K, config: configuration[K]) {
		this.lastConfig.set(id, config);
	}
}

export const featureConfigManager = new FeatureConfigManager();
