import type { FeatureBase, FeatureKeys } from "@/src/features/_registry/types";

export function createFeature<K extends FeatureKeys>(feature: FeatureBase<K>): FeatureBase<K> {
	return feature;
}
