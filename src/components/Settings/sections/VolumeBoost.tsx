import type { SelectOption } from "@/src/components/Inputs";

import Setting, { type parentSetting } from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function VolumeBoostSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	const VolumeBoostModeOptions: SelectOption<"volume_boost_mode">[] = [
		{
			label: t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.options.global),
			value: "global"
		},
		{
			label: t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.options.perVideo),
			value: "per_video"
		}
	];
	const volumeBoostParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.volumeBoost.enable.label
	} satisfies parentSetting;
	return (
		<SettingSection title={t((translations) => translations.settings.sections.volumeBoost.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_volume_boost?.toString() === "true"}
				label={t((translations) => translations.settings.sections.volumeBoost.enable.label)}
				onChange={setCheckboxOption("enable_volume_boost")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.volumeBoost.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_volume_boost?.toString() !== "true"}
				id="volume_boost_mode"
				label={t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.label)}
				onChange={setValueOption("volume_boost_mode")}
				options={VolumeBoostModeOptions}
				parentSetting={volumeBoostParentSetting}
				selectedOption={getSelectedOption("volume_boost_mode")}
				title={t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.title)}
				type="select"
			/>
			<Setting
				disabled={settings.enable_volume_boost?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.volumeBoost.settings.amount.label)}
				max={100}
				min={1}
				onChange={setValueOption("volume_boost_amount")}
				parentSetting={volumeBoostParentSetting}
				title={t((translations) => translations.settings.sections.volumeBoost.settings.amount.title)}
				type="number"
				value={settings.volume_boost_amount}
			/>
		</SettingSection>
	);
}
