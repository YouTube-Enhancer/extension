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
	const playlistLengthGetMethodOptions: SelectOption<"playlistLength.lengthGetMethod">[] = [
		{
			label: "API",
			value: "api"
		},
		{
			label: "HTML",
			value: "html"
		}
	];
	const playlistWatchTimeGetMethodOptions: SelectOption<"playlistLength.watchTimeGetMethod">[] = [
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
				checked={settings.playlistLength.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.playlistLength.enable.label)}
				onChange={setCheckboxOption("playlistLength.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.playlistLength.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.playlistLength.enabled?.toString() !== "true"}
				id="playlistLength.lengthGetMethod"
				label={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetLength.select.label)}
				onChange={setValueOption("playlistLength.lengthGetMethod")}
				options={playlistLengthGetMethodOptions}
				parentSetting={playlistLengthParentSetting}
				selectedOption={getSelectedOption("playlistLength.lengthGetMethod")}
				title={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetLength.select.title)}
				type="select"
			/>
			<Setting
				disabled={settings.playlistLength.enabled?.toString() !== "true"}
				id="playlistLength.watchTimeGetMethod"
				label={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.label)}
				onChange={setValueOption("playlistLength.watchTimeGetMethod")}
				options={playlistWatchTimeGetMethodOptions}
				parentSetting={playlistLengthParentSetting}
				selectedOption={getSelectedOption("playlistLength.watchTimeGetMethod")}
				title={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.title)}
				type="select"
			/>
		</SettingSection>
	);
}
