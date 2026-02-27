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
	const VolumeBoostModeOptions: SelectOption<"volumeBoost.mode">[] = [
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
				checked={settings.volumeBoost.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.volumeBoost.enable.label)}
				onChange={setCheckboxOption("volumeBoost.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.volumeBoost.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.volumeBoost.enabled?.toString() !== "true"}
				id="volumeBoost.mode"
				label={t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.label)}
				onChange={setValueOption("volumeBoost.mode")}
				options={VolumeBoostModeOptions}
				parentSetting={volumeBoostParentSetting}
				selectedOption={getSelectedOption("volumeBoost.mode")}
				title={t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.title)}
				type="select"
			/>
			<Setting
				disabled={settings.volumeBoost.enabled?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.volumeBoost.settings.amount.label)}
				max={100}
				min={1}
				onChange={setValueOption("volumeBoost.amount")}
				parentSetting={volumeBoostParentSetting}
				title={
					settings.volumeBoost.mode === "per_video" ?
						t((translations) => translations.settings.sections.volumeBoost.settings.amount.title)
					:	t((translations) => translations.settings.sections.volumeBoost.settings.amount_global_only.title)
				}
				type="number"
				value={settings.volumeBoost.amount}
			/>
		</SettingSection>
	);
}
