import type { ConfigShape, ConfigShapeFrom } from "@/src/features/_registry/defineConfig";
import type { FeatureKeys, FeatureMetadata, FeatureMetadataBase, MustContainEnabled } from "@/src/features/_registry/types";
import type { AllButtonNames, configuration } from "@/src/types";

import { extractDefaults, extractSchemaInput } from "@/src/features/_registry/defineConfig";

type ButtonInput = AllButtonNames | AllButtonNames[];

export function createFeatureMetadata<K extends FeatureKeys>(
	input: Omit<FeatureMetadataBase<K>, "button" | "defaults" | "schemaInput"> & {
		button?: ButtonInput;
		config: ConfigShapeFrom<MustContainEnabled<configuration[K]>>;
		state?: ConfigShape;
	}
): FeatureMetadata<K> {
	const defaults = extractDefaults(input.config);
	const schemaInput = extractSchemaInput(input.config);
	const button =
		input.button ?
			{
				names: Array.isArray(input.button) ? input.button : [input.button],
				path: "button" in input.config ? ("button" as const) : ("buttons" as const)
			}
		:	undefined;
	if (input.state) {
		const { config, state, ...rest } = input;
		return {
			...rest,
			button,
			defaults,
			schemaInput,
			stateSchemaInput: extractSchemaInput(state)
		} as FeatureMetadata<K>;
	}
	const { config, state, ...rest } = input;
	return { ...rest, button, defaults, schemaInput } as FeatureMetadata<K>;
}
