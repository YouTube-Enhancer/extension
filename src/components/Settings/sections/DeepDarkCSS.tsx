import type { SelectOption } from "@/src/components/Inputs";

import Link from "@/src/components/Link";
import Setting, { type parentSetting } from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { deepDarkPreset } from "@/src/deepDarkPresets";
import { cn } from "@/src/utils/utilities";

export default function DeepDarkCSSSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	const deepDarkCSSThemeOptions: SelectOption<"deep_dark_preset">[] = deepDarkPreset.map((value) => {
		return {
			label: value,
			value
		};
	});
	const isDeepDarkThemeDisabled = settings.enable_deep_dark_theme?.toString() !== "true";
	const isDeepDarkThemeCustom = settings.deep_dark_preset === "Custom";
	const deepDarkThemeColorPickerParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.deepDarkCSS.enable.label
	} satisfies parentSetting;
	return (
		<SettingSection title={t((translations) => translations.settings.sections.deepDarkCSS.title)}>
			<SettingTitle />
			<fieldset className={cn("flex flex-row gap-1")}>
				<fieldset className={cn("flex flex-row gap-1")}>
					<legend className="mb-1 text-lg sm:text-xl md:text-2xl">
						{t((translations) => translations.settings.sections.deepDarkCSS.extras.author)}
					</legend>
					<Link href="https://github.com/RaitaroH">RaitaroH</Link>
				</fieldset>
				<fieldset className={cn("flex flex-row gap-1")}>
					<legend className="mb-1 text-lg sm:text-xl md:text-2xl">
						{t((translations) => translations.settings.sections.deepDarkCSS.extras["co-authors"])}
					</legend>
					<Link href="https://github.com/MechaLynx">MechaLynx</Link>
				</fieldset>
			</fieldset>
			<Setting
				checked={settings.enable_deep_dark_theme?.toString() === "true"}
				label={t((translations) => translations.settings.sections.deepDarkCSS.enable.label)}
				onChange={setCheckboxOption("enable_deep_dark_theme")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.deepDarkCSS.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_deep_dark_theme?.toString() === "false"}
				id="deep_dark_preset"
				label={t((translations) => translations.settings.sections.deepDarkCSS.settings.theme.select.label)}
				onChange={setValueOption("deep_dark_preset")}
				options={deepDarkCSSThemeOptions}
				parentSetting={{
					type: "singular",
					value: (translations) => translations.settings.sections.deepDarkCSS.enable.label
				}}
				selectedOption={getSelectedOption("deep_dark_preset")}
				title={t((translations) => translations.settings.sections.deepDarkCSS.settings.theme.select.title)}
				type="select"
			/>
			{isDeepDarkThemeCustom && (
				<>
					<Setting
						disabled={isDeepDarkThemeDisabled}
						label={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainColor.label)}
						onChange={setValueOption("deep_dark_custom_theme_colors.mainColor")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainColor.title)}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.mainColor}
					/>
					<Setting
						disabled={isDeepDarkThemeDisabled}
						label={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainBackground.label)}
						onChange={setValueOption("deep_dark_custom_theme_colors.mainBackground")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainBackground.title)}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.mainBackground}
					/>
					<Setting
						disabled={isDeepDarkThemeDisabled}
						label={t((translations) => translations.settings.sections.deepDarkCSS.settings.secondBackground.label)}
						onChange={setValueOption("deep_dark_custom_theme_colors.secondBackground")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t((translations) => translations.settings.sections.deepDarkCSS.settings.secondBackground.title)}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.secondBackground}
					/>
					<Setting
						disabled={isDeepDarkThemeDisabled}
						label={t((translations) => translations.settings.sections.deepDarkCSS.settings.hoverBackground.label)}
						onChange={setValueOption("deep_dark_custom_theme_colors.hoverBackground")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t((translations) => translations.settings.sections.deepDarkCSS.settings.hoverBackground.title)}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.hoverBackground}
					/>
					<Setting
						disabled={isDeepDarkThemeDisabled}
						label={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainText.label)}
						onChange={setValueOption("deep_dark_custom_theme_colors.mainText")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainText.title)}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.mainText}
					/>
					<Setting
						disabled={isDeepDarkThemeDisabled}
						label={t((translations) => translations.settings.sections.deepDarkCSS.settings.dimmerText.label)}
						onChange={setValueOption("deep_dark_custom_theme_colors.dimmerText")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t((translations) => translations.settings.sections.deepDarkCSS.settings.dimmerText.title)}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.dimmerText}
					/>
					<Setting
						disabled={isDeepDarkThemeDisabled}
						label={t((translations) => translations.settings.sections.deepDarkCSS.settings.colorShadow.label)}
						onChange={setValueOption("deep_dark_custom_theme_colors.colorShadow")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t((translations) => translations.settings.sections.deepDarkCSS.settings.colorShadow.title)}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.colorShadow}
					/>
				</>
			)}
		</SettingSection>
	);
}
