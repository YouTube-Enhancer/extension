import type { SelectOption } from "@/src/components/Inputs";

import Setting, { type parentSetting } from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { getScrollWheelControlModifierKeyOptions } from "@/src/components/Settings/sections";
import { useSettings } from "@/src/components/Settings/Settings";
import { useNotifications } from "@/src/hooks";
export default function ScrollWheelVolumeControlSection() {
	const { getSelectedOption, i18nInstance, setCheckboxOption, settings, setValueOption } = useSettings();
	const { t } = i18nInstance;
	const { addNotification } = useNotifications();
	const scrollWheelVolumeControlParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.scrollWheelVolumeControl.enable.label
	} satisfies parentSetting;
	const scrollWheelControlModifierKeyOptions: SelectOption<"scroll_wheel_speed_control_modifier_key" | "scroll_wheel_volume_control_modifier_key">[] =
		getScrollWheelControlModifierKeyOptions(i18nInstance);
	return (
		<SettingSection title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_scroll_wheel_volume_control?.toString() === "true"}
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.enable.label)}
				onChange={setCheckboxOption("enable_scroll_wheel_volume_control")}
				parentSetting={scrollWheelVolumeControlParentSetting}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_scroll_wheel_volume_control_hold_modifier_key?.toString() === "true"}
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.label)}
				onChange={setCheckboxOption("enable_scroll_wheel_volume_control_hold_modifier_key")}
				parentSetting={scrollWheelVolumeControlParentSetting}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_scroll_wheel_volume_control_hold_right_click?.toString() === "true"}
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdRightClick.label)}
				onChange={setCheckboxOption("enable_scroll_wheel_volume_control_hold_right_click")}
				parentSetting={scrollWheelVolumeControlParentSetting}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdRightClick.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_scroll_wheel_volume_control_hold_modifier_key?.toString() !== "true"}
				id="scroll_wheel_volume_control_modifier_key"
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.select.label)}
				onChange={(value) => {
					const {
						currentTarget: { value: scrollWheelModifierKey }
					} = value;
					if (
						settings.enable_scroll_wheel_speed_control &&
						settings.enable_scroll_wheel_volume_control_hold_modifier_key &&
						settings.scroll_wheel_speed_control_modifier_key === scrollWheelModifierKey
					) {
						return addNotification(
							"error",
							(translations) => translations.pages.options.notifications.error.scrollWheelHoldModifierKey.sameKey.volumeControl
						);
					}
					setValueOption("scroll_wheel_volume_control_modifier_key")(value);
				}}
				options={scrollWheelControlModifierKeyOptions}
				parentSetting={scrollWheelVolumeControlParentSetting}
				selectedOption={getSelectedOption("scroll_wheel_volume_control_modifier_key")}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.select.title)}
				type="select"
			/>
			<Setting
				disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.adjustmentSteps.label)}
				min={1}
				onChange={setValueOption("volume_adjustment_steps")}
				parentSetting={scrollWheelVolumeControlParentSetting}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.adjustmentSteps.title)}
				type="number"
				value={settings.volume_adjustment_steps}
			/>
		</SettingSection>
	);
}
