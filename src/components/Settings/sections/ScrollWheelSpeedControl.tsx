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
	const scrollWheelControlModifierKeyOptions: SelectOption<"scrollWheelSpeedControl.modifierKey" | "scrollWheelVolumeControl.modifierKey">[] =
		getScrollWheelControlModifierKeyOptions(i18nInstance);
	return (
		<SettingSection title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.title)}>
			<SettingTitle />
			<Setting
				checked={settings.scrollWheelSpeedControl.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.scrollWheelSpeedControl.enable.label)}
				onChange={setCheckboxOption("scrollWheelSpeedControl.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.scrollWheelSpeedControl.enabled?.toString() !== "true"}
				id="scrollWheelSpeedControl.modifierKey"
				label={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.modifierKey.select.label)}
				onChange={(value) => {
					const {
						currentTarget: { value: scrollWheelModifierKey }
					} = value;
					if (
						settings.scrollWheelSpeedControl.enabled &&
						settings.scrollWheelVolumeControl.holdModifierKey &&
						settings.scrollWheelVolumeControl.modifierKey === scrollWheelModifierKey
					) {
						return addNotification(
							"error",
							(translations) => translations.pages.options.notifications.error.scrollWheelHoldModifierKey.sameKey.speedControl
						);
					}
					setValueOption("scrollWheelSpeedControl.modifierKey")(value);
				}}
				options={scrollWheelControlModifierKeyOptions}
				parentSetting={scrollWheelSpeedControlParentSetting}
				selectedOption={getSelectedOption("scrollWheelSpeedControl.modifierKey")}
				title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.modifierKey.select.title)}
				type="select"
			/>
			<Setting
				disabled={settings.scrollWheelSpeedControl.enabled?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.adjustmentSteps.label)}
				max={1}
				min={0.05}
				onChange={setValueOption("scrollWheelSpeedControl.steps")}
				parentSetting={scrollWheelSpeedControlParentSetting}
				step={0.05}
				title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.adjustmentSteps.title)}
				type="number"
				value={settings.scrollWheelSpeedControl.steps}
			/>
		</SettingSection>
	);
}
