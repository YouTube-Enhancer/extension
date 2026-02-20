import type { SelectOption } from "@/src/components/Inputs";

import Setting, { type parentSetting } from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function PlaylistLengthSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	const playlistLengthGetMethodOptions: SelectOption<"playlist_length_get_method">[] = [
		{
			label: "API",
			value: "api"
		},
		{
			label: "HTML",
			value: "html"
		}
	];
	const playlistWatchTimeGetMethodOptions: SelectOption<"playlist_watch_time_get_method">[] = [
		{
			label: t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.options.duration),
			value: "duration"
		},
		{
			label: t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.options.youtube),
			value: "youtube"
		}
	];
	const playlistLengthParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.playlistLength.enable.label
	} satisfies parentSetting;
	return (
		<SettingSection title={t((translations) => translations.settings.sections.playlistLength.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_playlist_length?.toString() === "true"}
				label={t((translations) => translations.settings.sections.playlistLength.enable.label)}
				onChange={setCheckboxOption("enable_playlist_length")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.playlistLength.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_playlist_length?.toString() !== "true"}
				id="playlist_length_get_method"
				label={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetLength.select.label)}
				onChange={setValueOption("playlist_length_get_method")}
				options={playlistLengthGetMethodOptions}
				parentSetting={playlistLengthParentSetting}
				selectedOption={getSelectedOption("playlist_length_get_method")}
				title={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetLength.select.title)}
				type="select"
			/>
			<Setting
				disabled={settings.enable_playlist_length?.toString() !== "true"}
				id="playlist_watch_time_get_method"
				label={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.label)}
				onChange={setValueOption("playlist_watch_time_get_method")}
				options={playlistWatchTimeGetMethodOptions}
				parentSetting={playlistLengthParentSetting}
				selectedOption={getSelectedOption("playlist_watch_time_get_method")}
				title={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.title)}
				type="select"
			/>
		</SettingSection>
	);
}
