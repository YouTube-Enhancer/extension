import type { AllButtonNames, configuration } from "@/src/types";

import { buttonNameToSettingName } from "@/src/types";

export function isButtonSelectDisabled(buttonName: AllButtonNames, settings: configuration) {
	switch (buttonName) {
		case "volumeBoostButton": {
			return settings.volumeBoost.mode === "global" || settings[buttonNameToSettingName[buttonName]].enabled === false;
		}
		default: {
			const { [buttonName]: settingName } = buttonNameToSettingName;
			const { [settingName]: featureSetting } = settings;
			if (!featureSetting) return true;
			if ("buttons" in featureSetting) {
				const buttons = featureSetting.buttons as Record<string, { enabled: boolean }>;
				if (buttonName in buttons) {
					return buttons[buttonName].enabled === false;
				}
			}
			if ("button" in featureSetting) {
				return featureSetting.button.enabled === false;
			}
			return false;
		}
	}
}
