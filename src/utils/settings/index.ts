import type { AllButtonNames, configuration } from "@/src/types";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";

export function isButtonSelectDisabled(buttonName: AllButtonNames, settings: configuration) {
	const settingName = metadataRegistry.getButtonFeature(buttonName);
	if (!settingName) return true;
	switch (buttonName) {
		case "volumeBoostButton": {
			return settings.volumeBoost.mode === "global" || (settings[settingName] as { enabled?: boolean }).enabled === false;
		}
		default: {
			const { [settingName]: featureSetting } = settings;
			if (!featureSetting) return true;
			if ("buttons" in featureSetting) {
				const buttons = featureSetting.buttons as Record<string, { enabled: boolean }>;
				if (buttonName in buttons) {
					return buttons[buttonName].enabled === false;
				}
			}
			if ("button" in featureSetting) {
				return (featureSetting as { button: { enabled: boolean } }).button.enabled === false;
			}
			return false;
		}
	}
}
