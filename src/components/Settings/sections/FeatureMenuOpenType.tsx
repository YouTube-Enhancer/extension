import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
export default function FeatureMenuOpenTypeSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		settings,
		setValueOption
	} = useSettings();
	return (
		<SettingSection title={t((translations) => translations.pages.options.extras.featureMenu.openType.title)}>
			<SettingTitle />
			<Setting
				disabled={Object.values(settings.button_placements).every((v) => v !== "feature_menu")}
				id="feature_menu_open_type"
				label={t((translations) => translations.pages.options.extras.featureMenu.openType.select.label)}
				onChange={setValueOption("feature_menu_open_type")}
				options={[
					{ label: t((translations) => translations.pages.options.extras.featureMenu.openType.select.options.hover), value: "hover" },
					{ label: t((translations) => translations.pages.options.extras.featureMenu.openType.select.options.click), value: "click" }
				]}
				parentSetting={{
					type: "specificOption",
					value: (translations) => translations.pages.options.extras.optionDisabled.specificOption.featureMenu
				}}
				selectedOption={getSelectedOption("feature_menu_open_type")}
				title={t((translations) => translations.pages.options.extras.featureMenu.openType.select.title)}
				type="select"
			/>
		</SettingSection>
	);
}
