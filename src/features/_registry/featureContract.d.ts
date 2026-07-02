import type { FeatureBase } from "@/src/features/_registry/types";

import type { createFeatureMetadata } from "./createFeatureMetadata";

// Each feature index.ts must default-export a FeatureBase object
declare module "/src/features/*/index.ts" {
	const _default: FeatureBase<any>;
	export default _default;
}

// Each feature index.metadata.ts must export `metadata` created via `createFeatureMetadata`
declare module "/src/features/*/index.metadata.ts" {
	export const metadata: ReturnType<typeof createFeatureMetadata>;
}
