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
	const scrollWheelControlModifierKeyOptions: SelectOption<"scrollWheelSpeedControl.modifierKey" | "scrollWheelVolumeControl.modifierKey">[] =
		getScrollWheelControlModifierKeyOptions(i18nInstance);
	return (
		<SettingSection title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.title)}>
			<SettingTitle />
			<Setting
				checked={settings.scrollWheelVolumeControl.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.enable.label)}
				onChange={setCheckboxOption("scrollWheelVolumeControl.enabled")}
				parentSetting={scrollWheelVolumeControlParentSetting}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.scrollWheelVolumeControl.holdModifierKey?.toString() === "true"}
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.label)}
				onChange={setCheckboxOption("scrollWheelVolumeControl.holdModifierKey")}
				parentSetting={scrollWheelVolumeControlParentSetting}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.scrollWheelVolumeControl.holdRightClick?.toString() === "true"}
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdRightClick.label)}
				onChange={setCheckboxOption("scrollWheelVolumeControl.holdRightClick")}
				parentSetting={scrollWheelVolumeControlParentSetting}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdRightClick.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.scrollWheelVolumeControl.holdModifierKey?.toString() !== "true"}
				id="scrollWheelVolumeControl.modifierKey"
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.select.label)}
				onChange={(value) => {
					const {
						currentTarget: { value: scrollWheelModifierKey }
					} = value;
					if (
						settings.scrollWheelSpeedControl.enabled &&
						settings.scrollWheelVolumeControl.holdModifierKey &&
						settings.scrollWheelSpeedControl.modifierKey === scrollWheelModifierKey
					) {
						return addNotification(
							"error",
							(translations) => translations.pages.options.notifications.error.scrollWheelHoldModifierKey.sameKey.volumeControl
						);
					}
					setValueOption("scrollWheelVolumeControl.modifierKey")(value);
				}}
				options={scrollWheelControlModifierKeyOptions}
				parentSetting={scrollWheelVolumeControlParentSetting}
				selectedOption={getSelectedOption("scrollWheelVolumeControl.modifierKey")}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.select.title)}
				type="select"
			/>
			<Setting
				disabled={settings.scrollWheelVolumeControl.enabled?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.adjustmentSteps.label)}
				min={1}
				onChange={setValueOption("scrollWheelVolumeControl.steps")}
				parentSetting={scrollWheelVolumeControlParentSetting}
				title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.adjustmentSteps.title)}
				type="number"
				value={settings.scrollWheelVolumeControl.steps}
			/>
		</SettingSection>
	);
}
