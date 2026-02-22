import type { ChangeEvent } from "react";

import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function CustomCSSSection() {
	const {
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	return (
		<SettingSection title={t((translations) => translations.settings.sections.customCSS.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_custom_css?.toString() === "true"}
				label={t((translations) => translations.settings.sections.customCSS.enable.label)}
				onChange={setCheckboxOption("enable_custom_css")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.customCSS.enable.title)}
				type="checkbox"
			/>
			<Setting
				alwaysVisible
				disabled={settings.enable_custom_css?.toString() !== "true"}
				onChange={(value) => {
					if (value !== undefined) {
						setValueOption("custom_css_code")({ currentTarget: { value } } as ChangeEvent<HTMLInputElement>);
					}
				}}
				parentSetting={{
					type: "singular",
					value: (translations) => translations.settings.sections.customCSS.enable.label
				}}
				type="css-editor"
				value={settings.custom_css_code}
			/>
		</SettingSection>
	);
}
