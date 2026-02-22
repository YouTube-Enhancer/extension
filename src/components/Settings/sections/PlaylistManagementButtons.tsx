import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function PlaylistManagementButtonsSection() {
	const {
		i18nInstance: { t },
		setCheckboxOption,
		settings
	} = useSettings();
	return (
		<SettingSection title={t((translations) => translations.settings.sections.playlistManagementButtons.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_playlist_remove_button?.toString() === "true"}
				label={t((translations) => translations.settings.sections.playlistManagementButtons.settings.removeVideoButton.enable.label)}
				onChange={setCheckboxOption("enable_playlist_remove_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.playlistManagementButtons.settings.removeVideoButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_playlist_reset_button?.toString() === "true"}
				label={t((translations) => translations.settings.sections.playlistManagementButtons.settings.markAsUnwatchedButton.enable.label)}
				onChange={setCheckboxOption("enable_playlist_reset_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.playlistManagementButtons.settings.markAsUnwatchedButton.enable.title)}
				type="checkbox"
			/>
		</SettingSection>
	);
}
