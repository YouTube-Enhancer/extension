import type { FeatureBase, FeatureKeys, FeatureMetadata } from "@/src/features/_registry/types";

import { modifyElementClassList } from "@/src/utils/dom/classList";

function camelToKebab(str: string): string {
	return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function createCssToggleFeature<K extends FeatureKeys>(
	metadata: FeatureMetadata<K>,
	options?: { className?: string }
): FeatureBase<K> {
	const className = options?.className ?? `yte-${camelToKebab(metadata.id)}`;
	return {
		...metadata,
		onDisable: () => {
			modifyElementClassList("remove", { className, element: document.body });
		},
		onEnable: () => {
			modifyElementClassList("add", { className, element: document.body });
		}
	} as unknown as FeatureBase<K>;
}
