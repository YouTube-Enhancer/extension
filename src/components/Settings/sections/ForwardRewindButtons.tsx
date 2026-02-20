import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function ForwardRewindButtonsSection() {
	const {
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	return (
		<SettingSection title={t((translations) => translations.settings.sections.forwardRewindButtons.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_forward_rewind_buttons?.toString() === "true"}
				label={t((translations) => translations.settings.sections.forwardRewindButtons.enable.label)}
				onChange={setCheckboxOption("enable_forward_rewind_buttons")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.forwardRewindButtons.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_forward_rewind_buttons?.toString() !== "true"}
				label={t((translations) => translations.settings.sections.forwardRewindButtons.settings.time.label)}
				onChange={setValueOption("forward_rewind_buttons_time")}
				parentSetting={{
					type: "singular",
					value: (translations) => translations.settings.sections.forwardRewindButtons.enable.label
				}}
				title={t((translations) => translations.settings.sections.forwardRewindButtons.settings.time.title)}
				type="number"
				value={settings.forward_rewind_buttons_time}
			/>
		</SettingSection>
	);
}
