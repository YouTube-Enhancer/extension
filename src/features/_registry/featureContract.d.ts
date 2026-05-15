import type { FeatureBase } from "@/src/features/_registry/types";

import type { createFeatureMetadata } from "./createFeatureMetadata";

declare module "/src/features/*/index.ts" {
	// Each feature index.ts must export `metadata` created via `createFeatureMetadata`
	export const metadata: ReturnType<typeof createFeatureMetadata>;

	// Default export must be a FeatureBase object
	const _default: FeatureBase<any>;
	export default _default;
}
