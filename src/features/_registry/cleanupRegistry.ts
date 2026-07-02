import type { FeatureKeys } from "@/src/features/_registry/types";

const cleanupFns = new Map<FeatureKeys, Array<() => void>>();

export const cleanupRegistry = {
	add(featureName: FeatureKeys, fn: () => void) {
		const fns = cleanupFns.get(featureName) ?? [];
		fns.push(fn);
		cleanupFns.set(featureName, fns);
	},

	run(featureName: FeatureKeys) {
		const fns = cleanupFns.get(featureName);
		if (!fns) return;
		for (const fn of fns) {
			try {
				fn();
			} catch (error) {
				console.error(`[cleanupRegistry] Cleanup failed for ${featureName}:`, error);
			}
		}
		cleanupFns.delete(featureName);
	},

	runAll() {
		for (const featureName of cleanupFns.keys()) {
			this.run(featureName);
		}
	}
};
