import type { FeatureKeys } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { deepEqual } from "@/src/utils/deepEqual";

/**
 * Read-only view of the per-feature config cache.
 *
 * configProvider is the sole writer (seed, navigation reseed, storage broadcasts,
 * applyFeatureConfig). getLast never throws: unseeded features return undefined.
 * Callers that need a value use getLastOr with metadata defaults, or receive
 * config directly from lifecycle callbacks (which fall back to defaults).
 */
class FeatureConfigManager {
	private lastConfig = new Map<FeatureKeys, configuration[FeatureKeys]>();

	/** Soft read. Undefined until the feature has been seeded. */
	getLast<K extends FeatureKeys>(id: K): configuration[K] | undefined {
		return this.lastConfig.get(id) as configuration[K] | undefined;
	}

	getLastOr<K extends FeatureKeys>(id: K, fallback: configuration[K]): configuration[K] {
		return (this.lastConfig.get(id) ?? fallback) as configuration[K];
	}

	hasChanged<K extends FeatureKeys>(
		prev: configuration[K] | undefined,
		next: configuration[K]
	): boolean {
		return !deepEqual(prev, next);
	}

	/**
	 * @internal Prefer configProvider.applyFeatureConfig. Direct setLast from feature
	 * modules bypasses the single-writer seam.
	 */
	setLast<K extends FeatureKeys>(id: K, config: configuration[K]) {
		this.lastConfig.set(id, config);
	}
}

export const featureConfigManager = new FeatureConfigManager();
