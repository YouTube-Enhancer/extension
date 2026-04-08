import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function HideShortsSection() {
	const {
		i18nInstance: { t },
		setCheckboxOption,
		settings
	} = useSettings();

	return (
		<SettingSection title={t((translations) => translations.settings.sections.hideShorts.title)}>
			<SettingTitle />
			<Setting
				checked={settings.hideShorts.sidebar.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.sidebar.label)}
				onChange={setCheckboxOption("hideShorts.sidebar.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.sidebar.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideShorts.home.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.home.label)}
				onChange={setCheckboxOption("hideShorts.home.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.home.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideShorts.channel.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.channel.label)}
				onChange={setCheckboxOption("hideShorts.channel.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.channel.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideShorts.search.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.search.label)}
				onChange={setCheckboxOption("hideShorts.search.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.search.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.hideShorts.videos.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.videos.label)}
				onChange={setCheckboxOption("hideShorts.videos.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.videos.title)}
				type="checkbox"
			/>
		</SettingSection>
	);
}
