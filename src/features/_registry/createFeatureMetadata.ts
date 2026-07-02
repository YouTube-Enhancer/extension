import type { ConfigShape, ConfigShapeFrom } from "@/src/features/_registry/defineConfig";
import type { FeatureKeys, FeatureMetadata, FeatureMetadataBase, MustContainEnabled } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { extractDefaults, extractSchemaInput } from "@/src/features/_registry/defineConfig";

export function createFeatureMetadata<K extends FeatureKeys>(
	input: Omit<FeatureMetadataBase<K>, "defaults" | "schemaInput"> & {
		config: ConfigShapeFrom<MustContainEnabled<configuration[K]>>;
		state?: ConfigShape;
	}
): FeatureMetadata<K> {
	const defaults = extractDefaults(input.config);
	const schemaInput = extractSchemaInput(input.config);
	if (input.state) {
		const { config, state, ...rest } = input;
		return {
			...rest,
			defaults,
			schemaInput,
			stateSchemaInput: extractSchemaInput(state)
		} as FeatureMetadata<K>;
	}
	const { config, state, ...rest } = input;
	return { ...rest, defaults, schemaInput } as FeatureMetadata<K>;
}
