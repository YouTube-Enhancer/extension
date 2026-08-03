import type { FeatureKeys } from "@/src/features/_registry/types";
import type { configuration, Nullable } from "@/src/types";

export type FeatureGridData = {
	disabledCount: number;
	enabledCount: number;
	features: FeatureInfo[];
	filteredFeatures: FeatureInfo[];
};

export type FeatureInfo = {
	config: configuration[FeatureKeys] | null;
	enabled: boolean;
	enabledPath: Nullable<string>;
	hasConfigurableSettings: boolean;
	hasNestedEnabled: boolean;
	hasState: boolean;
	id: FeatureKeys;
	subFeatures?: SubFeatureInfo[];
};

export type FilterType = "all" | "disabled" | "enabled";

export type SubFeatureInfo = {
	enabled: boolean;
	key: string;
	path: string;
};
