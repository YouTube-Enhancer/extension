import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function GlobalVolumeSection() {
	const {
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	return (
		<SettingSection title={t((translations) => translations.settings.sections.globalVolume.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_remember_last_volume?.toString() !== "true" && settings.enable_global_volume?.toString() === "true"}
				disabled={settings.enable_remember_last_volume?.toString() === "true"}
				disabledReason={t((translations) => translations.pages.options.extras.optionDisabled.specificOption.globalVolume)}
				label={t((translations) => translations.settings.sections.globalVolume.enable.label)}
				onChange={setCheckboxOption("enable_global_volume")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.globalVolume.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_remember_last_volume?.toString() === "true" || settings.enable_global_volume?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.globalVolume.settings.amount.label)}
				max={100}
				min={1}
				onChange={setValueOption("global_volume")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.globalVolume.settings.amount.title)}
				type="number"
				value={settings.global_volume}
			/>
		</SettingSection>
	);
}
