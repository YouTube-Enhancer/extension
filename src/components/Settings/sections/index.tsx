import type { SelectOption } from "@/src/components/Inputs";
import type { i18nInstanceType } from "@/src/i18n";

import ButtonPlacementSection from "@/src/components/Settings/sections/ButtonPlacement";
import CustomCSSSection from "@/src/components/Settings/sections/CustomCSS";
import DeepDarkCSSSection from "@/src/components/Settings/sections/DeepDarkCSS";
import FeatureMenuOpenTypeSection from "@/src/components/Settings/sections/FeatureMenuOpenType";
import ForwardRewindButtonsSection from "@/src/components/Settings/sections/ForwardRewindButtons";
import GlobalVolumeSection from "@/src/components/Settings/sections/GlobalVolume";
import MiniPlayerSection from "@/src/components/Settings/sections/MiniPlayer";
import MiscellaneousSection from "@/src/components/Settings/sections/Miscellaneous";
import OnScreenDisplaySection from "@/src/components/Settings/sections/OnScreenDisplay";
import PlayerQualitySection from "@/src/components/Settings/sections/PlayerQuality";
import PlayerSpeedSection from "@/src/components/Settings/sections/PlayerSpeed";
import PlaylistLengthSection from "@/src/components/Settings/sections/PlaylistLength";
import PlaylistManagementButtonsSection from "@/src/components/Settings/sections/PlaylistManagementButtons";
import ScreenshotButtonSection from "@/src/components/Settings/sections/ScreenshotButton";
import ScrollWheelSpeedControlSection from "@/src/components/Settings/sections/ScrollWheelSpeedControl";
import ScrollWheelVolumeControlSection from "@/src/components/Settings/sections/ScrollWheelVolumeControl";
import VideoHistorySection from "@/src/components/Settings/sections/VideoHistory";
import VolumeBoostSection from "@/src/components/Settings/sections/VolumeBoost";
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
	] satisfies SelectOption<"scroll_wheel_speed_control_modifier_key" | "scroll_wheel_volume_control_modifier_key">[];
}
export {
	ButtonPlacementSection,
	CustomCSSSection,
	DeepDarkCSSSection,
	FeatureMenuOpenTypeSection,
	ForwardRewindButtonsSection,
	GlobalVolumeSection,
	MiniPlayerSection,
	MiscellaneousSection,
	OnScreenDisplaySection,
	PlayerQualitySection,
	PlayerSpeedSection,
	PlaylistLengthSection,
	PlaylistManagementButtonsSection,
	ScreenshotButtonSection,
	ScrollWheelSpeedControlSection,
	ScrollWheelVolumeControlSection,
	VideoHistorySection,
	VolumeBoostSection,
	YouTubeDataApiKeySection
};
