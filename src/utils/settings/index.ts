import type { i18nInstanceType } from "@/src/i18n";
import type { AllButtonNames, configuration } from "@/src/types";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";

/**
 * The tooltip a disabled button placement select should show, or `undefined` when the select is
 * enabled. It answers the same question as {@link isButtonSelectDisabled} - which toggle stands
 * between the user and this option - so the two must stay in sync.
 */
export function getButtonSelectDisabledReason(
	buttonName: AllButtonNames,
	settings: configuration,
	t: i18nInstanceType["t"]
): string | undefined {
	if (!isButtonSelectDisabled(buttonName, settings)) return undefined;
	// The volume boost button only renders in per-video mode, so while the mode select still says
	// 'Global' placement has no button to move. Turning the feature on comes first.
	if (buttonName === "volumeBoostButton" && settings.volumeBoost.enabled !== false) {
		return t((tr) => tr.pages.options.extras.optionDisabled.specificOption.volumeBoostMode);
	}
	const featureId = metadataRegistry.getButtonFeature(buttonName);
	if (!featureId) return undefined;
	const configPath = metadataRegistry.getButtonConfigPath(buttonName);
	const enableSettingId = configPath
		? `${featureId}.${configPath}.enabled`
		: `${featureId}.enabled`;
	const enableLabel =
		metadataRegistry.getSettingLabel(featureId, enableSettingId) ??
		metadataRegistry.getSettingLabel(featureId, `${featureId}.enabled`);
	if (!enableLabel) return undefined;
	return t((tr) => tr.pages.options.extras.optionDisabled.singular, {
		OPTION: enableLabel(t)
	});
}

export function isButtonSelectDisabled(buttonName: AllButtonNames, settings: configuration) {
	const settingName = metadataRegistry.getButtonFeature(buttonName);
	if (!settingName) return true;
	switch (buttonName) {
		case "volumeBoostButton": {
			return (
				settings.volumeBoost.mode === "global" ||
				(settings[settingName] as { enabled?: boolean }).enabled === false
			);
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
