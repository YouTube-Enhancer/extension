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
				checked={settings.enable_hide_shorts_sidebar?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.sidebar.label)}
				onChange={setCheckboxOption("enable_hide_shorts_sidebar")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.sidebar.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_shorts_home?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.home.label)}
				onChange={setCheckboxOption("enable_hide_shorts_home")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.home.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_shorts_channel?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.channel.label)}
				onChange={setCheckboxOption("enable_hide_shorts_channel")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.channel.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_shorts_search?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.search.label)}
				onChange={setCheckboxOption("enable_hide_shorts_search")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.search.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_hide_shorts_videos?.toString() === "true"}
				label={t((translations) => translations.settings.sections.hideShorts.settings.videos.label)}
				onChange={setCheckboxOption("enable_hide_shorts_videos")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.hideShorts.settings.videos.title)}
				type="checkbox"
			/>
		</SettingSection>
	);
}
