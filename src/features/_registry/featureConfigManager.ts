import type { FeatureKeys } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

class FeatureConfigManager {
	private lastConfig = new Map<FeatureKeys, configuration[FeatureKeys]>();

	getLast<K extends FeatureKeys>(id: K): configuration[K] {
		const cfg = this.lastConfig.get(id);
		if (!cfg) throw new Error(`Config not found for ${id}`);
		return cfg as configuration[K];
	}

	hasChanged<K extends FeatureKeys>(prev: configuration[K] | undefined, next: configuration[K]): boolean {
		return !configsAreEqual(prev, next);
	}

	setLast<K extends FeatureKeys>(id: K, config: configuration[K]) {
		this.lastConfig.set(id, config);
	}
}
// Cache for object keys to avoid recomputing them on every comparison
const keysCache = new WeakMap<object, string[]>();
function configsAreEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
		return false;
	}

	// Get or compute keys for a
	let keysA: string[];
	if (keysCache.has(a)) {
		keysA = keysCache.get(a)!;
	} else {
		keysA = Object.keys(a);
		keysCache.set(a, keysA);
	}

	// Get or compute keys for b
	let keysB: string[];
	if (keysCache.has(b)) {
		keysB = keysCache.get(b)!;
	} else {
		keysB = Object.keys(b);
		keysCache.set(b, keysB);
	}
	if (keysA.length !== keysB.length) return false;
	for (const key of keysA) {
		if (!keysB.includes(key)) return false;
		if (!configsAreEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
	}
	return true;
}
export const featureConfigManager = new FeatureConfigManager();
