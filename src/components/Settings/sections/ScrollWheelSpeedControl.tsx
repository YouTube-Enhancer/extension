import type { SelectOption } from "@/src/components/Inputs";

import Setting, { type parentSetting } from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { getScrollWheelControlModifierKeyOptions } from "@/src/components/Settings/sections";
import { useSettings } from "@/src/components/Settings/Settings";
import { useNotifications } from "@/src/hooks";
export default function ScrollWheelSpeedControlSection() {
	const { getSelectedOption, i18nInstance, setCheckboxOption, settings, setValueOption } = useSettings();
	const { t } = i18nInstance;
	const { addNotification } = useNotifications();
	const scrollWheelSpeedControlParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.scrollWheelSpeedControl.enable.label
	} satisfies parentSetting;
	const scrollWheelControlModifierKeyOptions: SelectOption<"scroll_wheel_speed_control_modifier_key" | "scroll_wheel_volume_control_modifier_key">[] =
		getScrollWheelControlModifierKeyOptions(i18nInstance);
	return (
		<SettingSection title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_scroll_wheel_speed_control?.toString() === "true"}
				label={t((translations) => translations.settings.sections.scrollWheelSpeedControl.enable.label)}
				onChange={setCheckboxOption("enable_scroll_wheel_speed_control")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_scroll_wheel_speed_control?.toString() !== "true"}
				id="scroll_wheel_speed_control_modifier_key"
				label={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.modifierKey.select.label)}
				onChange={(value) => {
					const {
						currentTarget: { value: scrollWheelModifierKey }
					} = value;
					if (
						settings.enable_scroll_wheel_speed_control &&
						settings.enable_scroll_wheel_volume_control_hold_modifier_key &&
						settings.scroll_wheel_volume_control_modifier_key === scrollWheelModifierKey
					) {
						return addNotification(
							"error",
							(translations) => translations.pages.options.notifications.error.scrollWheelHoldModifierKey.sameKey.speedControl
						);
					}
					setValueOption("scroll_wheel_speed_control_modifier_key")(value);
				}}
				options={scrollWheelControlModifierKeyOptions}
				parentSetting={scrollWheelSpeedControlParentSetting}
				selectedOption={getSelectedOption("scroll_wheel_speed_control_modifier_key")}
				title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.modifierKey.select.title)}
				type="select"
			/>
			<Setting
				disabled={settings.enable_scroll_wheel_speed_control?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.adjustmentSteps.label)}
				max={1}
				min={0.05}
				onChange={setValueOption("speed_adjustment_steps")}
				parentSetting={scrollWheelSpeedControlParentSetting}
				step={0.05}
				title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.adjustmentSteps.title)}
				type="number"
				value={settings.speed_adjustment_steps}
			/>
		</SettingSection>
	);
}
