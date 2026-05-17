import type { AllConfigsData } from "@/components/devtools/hooks/useDevToolsQuery";
import type { FeatureKeys, SettingConfig, SettingId, SettingNode } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

export type ConfigInputProps<F extends FeatureKeys> = {
	allConfigs: AllConfigsData;
	currentValue: unknown;
	onChange: (id: SettingId<F>, value: unknown) => void;
	setting: SettingConfig<F>;
	t: import("@/src/pipeline/utils").TFunction;
};

export type ConfigSlideOverProps<F extends FeatureKeys> = {
	allConfigs: AllConfigsData;
	currentConfig: configuration[F] | null;
	featureId: F;
	isOpen: boolean;
	onClose: () => void;
	onConfigSaved: () => void;
};

export type SettingItem<F extends FeatureKeys> = {
	currentValue: unknown;
	id: SettingId<F>;
};

export type { SettingConfig, SettingId, SettingNode };
