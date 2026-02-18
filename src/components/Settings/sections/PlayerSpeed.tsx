import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { youtubePlayerMaxSpeed, youtubePlayerSpeedStep } from "@/src/types";
export default function PlayerSpeedSection() {
	const {
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	return (
		<SettingSection title={t((translations) => translations.settings.sections.playerSpeed.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_forced_playback_speed?.toString() === "true"}
				label={t((translations) => translations.settings.sections.playerSpeed.enable.label)}
				onChange={setCheckboxOption("enable_forced_playback_speed")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.playerSpeed.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.enable_playback_speed_buttons?.toString() === "true"}
				label={t((translations) => translations.settings.sections.playerSpeed.settings.buttons.label)}
				onChange={setCheckboxOption("enable_playback_speed_buttons")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.playerSpeed.settings.buttons.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_forced_playback_speed?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.playerSpeed.settings.speed.select.label)}
				max={youtubePlayerMaxSpeed}
				min={youtubePlayerSpeedStep}
				onChange={setValueOption("player_speed")}
				parentSetting={{
					type: "singular",
					value: (translations) => translations.settings.sections.playerSpeed.enable.label
				}}
				step={youtubePlayerSpeedStep}
				title={t((translations) => translations.settings.sections.playerSpeed.settings.speed.select.title)}
				type="number"
				value={settings.player_speed}
			/>
			<Setting
				disabled={settings.enable_playback_speed_buttons?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.playerSpeed.settings.buttons.select.label)}
				max={1}
				min={youtubePlayerSpeedStep}
				onChange={setValueOption("playback_buttons_speed")}
				parentSetting={{
					type: "singular",
					value: (translations) => translations.settings.sections.playerSpeed.settings.buttons.label
				}}
				step={youtubePlayerSpeedStep}
				title={t((translations) => translations.settings.sections.playerSpeed.settings.buttons.select.title)}
				type="number"
				value={settings.playback_buttons_speed}
			/>
		</SettingSection>
	);
}
