import type { SelectOption } from "@/src/components/Inputs";

import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function MiniPlayerSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	const miniPlayerDefaultSizeOptions: SelectOption<"miniPlayer.defaultSize">[] = [
		{ label: "320x180", value: "320x180" },
		{ label: "400x225", value: "400x225" },
		{ label: "480x270", value: "480x270" },
		{ label: "560x315", value: "560x315" }
	];
	const miniPlayerDefaultPositionOptions: SelectOption<"miniPlayer.defaultPosition">[] = [
		{ label: t((translations) => translations.settings.sections.miniPlayer.settings.position.select.options.topLeft), value: "top_left" },
		{ label: t((translations) => translations.settings.sections.miniPlayer.settings.position.select.options.topCenter), value: "top_center" },
		{ label: t((translations) => translations.settings.sections.miniPlayer.settings.position.select.options.topRight), value: "top_right" },
		{ label: t((translations) => translations.settings.sections.miniPlayer.settings.position.select.options.bottomLeft), value: "bottom_left" },
		{ label: t((translations) => translations.settings.sections.miniPlayer.settings.position.select.options.bottomCenter), value: "bottom_center" },
		{ label: t((translations) => translations.settings.sections.miniPlayer.settings.position.select.options.bottomRight), value: "bottom_right" }
	];
	return (
		<SettingSection title={t((translations) => translations.settings.sections.miniPlayer.title)}>
			<SettingTitle />
			<Setting
				checked={settings.miniPlayer.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miniPlayer.enable.label)}
				onChange={setCheckboxOption("miniPlayer.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miniPlayer.enable.title)}
				type="checkbox"
			/>
			<Setting
				checked={settings.miniPlayerButton.enabled?.toString() === "true"}
				label={t((translations) => translations.settings.sections.miniPlayer.button.label)}
				onChange={setCheckboxOption("miniPlayerButton.enabled")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.miniPlayer.button.title)}
				type="checkbox"
			/>
			<Setting
				id="miniPlayer.defaultSize"
				label={t((translations) => translations.settings.sections.miniPlayer.settings.size.label)}
				onChange={setValueOption("miniPlayer.defaultSize")}
				options={miniPlayerDefaultSizeOptions}
				parentSetting={null}
				selectedOption={getSelectedOption("miniPlayer.defaultSize")}
				title={t((translations) => translations.settings.sections.miniPlayer.settings.size.title)}
				type="select"
			/>
			<Setting
				id="miniPlayer.defaultPosition"
				label={t((translations) => translations.settings.sections.miniPlayer.settings.position.select.label)}
				onChange={setValueOption("miniPlayer.defaultPosition")}
				options={miniPlayerDefaultPositionOptions}
				parentSetting={null}
				selectedOption={getSelectedOption("miniPlayer.defaultPosition")}
				title={t((translations) => translations.settings.sections.miniPlayer.settings.position.select.title)}
				type="select"
			/>
		</SettingSection>
	);
}
