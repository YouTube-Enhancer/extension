import type { SelectOption } from "@/src/components/Inputs";
import type { i18nInstanceType } from "@/src/i18n";

import ButtonPlacementSection from "@/src/components/Settings/sections/ButtonPlacement";
import FeatureMenuOpenTypeSection from "@/src/components/Settings/sections/FeatureMenuOpenType";
import LanguageSettingsSection from "@/src/components/Settings/sections/LanguageSettings";
import OnScreenDisplaySection from "@/src/components/Settings/sections/OnScreenDisplay";
import YouTubeDataApiKeySection from "@/src/components/Settings/sections/YouTubeDataApiKey";

export function getScrollWheelControlModifierKeyOptions({ t }: i18nInstanceType) {
	return [
		{
			label: t((translations) => translations.settings.sections.scrollWheelVolumeControl.extras.optionLabel, {
				KEY: "Alt"
			}),
			value: "altKey"
		},
		{
			label: t((translations) => translations.settings.sections.scrollWheelVolumeControl.extras.optionLabel, {
				KEY: "Ctrl"
			}),
			value: "ctrlKey"
		},
		{
			label: t((translations) => translations.settings.sections.scrollWheelVolumeControl.extras.optionLabel, {
				KEY: "Shift"
			}),
			value: "shiftKey"
		}
	] satisfies SelectOption<"scrollWheelSpeedControl.modifierKey" | "scrollWheelVolumeControl.modifierKey">[];
}
export { ButtonPlacementSection, FeatureMenuOpenTypeSection, LanguageSettingsSection, OnScreenDisplaySection, YouTubeDataApiKeySection };
