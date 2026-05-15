import type { FeatureKeys, FeatureMetadata } from "@/src/features/_registry/types";

export function createFeatureMetadata<K extends FeatureKeys>(metadata: FeatureMetadata<K>) {
	return metadata;
}
