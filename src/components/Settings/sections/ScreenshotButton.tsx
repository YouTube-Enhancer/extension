import type { SelectOption } from "@/src/components/Inputs";

import Setting, { type parentSetting } from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";

export default function ScreenshotButtonSection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		setCheckboxOption,
		settings,
		setValueOption
	} = useSettings();
	const ScreenshotFormatOptions: SelectOption<"screenshot_format">[] = [
		{ label: "PNG", value: "png" },
		{ label: "JPEG", value: "jpeg" },
		{ label: "WebP", value: "webp" }
	];
	const ScreenshotSaveAsOptions: SelectOption<"screenshot_save_as">[] = [
		{ label: t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.options.file), value: "file" },
		{ label: t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.options.clipboard), value: "clipboard" },
		{ label: t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.options.both), value: "both" }
	];
	const screenshotButtonParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.screenshotButton.enable.label
	} satisfies parentSetting;
	const screenshotButtonSaveAsClipboardParentSetting = {
		type: "specificOption",
		value: (translations) => translations.pages.options.extras.optionDisabled.specificOption.screenshotButtonFileFormat
	} satisfies parentSetting;
	return (
		<SettingSection title={t((translations) => translations.settings.sections.screenshotButton.title)}>
			<SettingTitle />
			<Setting
				checked={settings.enable_screenshot_button?.toString() === "true"}
				label={t((translations) => translations.settings.sections.screenshotButton.enable.label)}
				onChange={setCheckboxOption("enable_screenshot_button")}
				parentSetting={null}
				title={t((translations) => translations.settings.sections.screenshotButton.enable.title)}
				type="checkbox"
			/>
			<Setting
				disabled={settings.enable_screenshot_button?.toString() !== "true"}
				id="screenshot_save_as"
				label={t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.label)}
				onChange={setValueOption("screenshot_save_as")}
				options={ScreenshotSaveAsOptions}
				parentSetting={screenshotButtonParentSetting}
				selectedOption={getSelectedOption("screenshot_save_as")}
				title={t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.label)}
				type="select"
			/>
			<Setting
				disabled={settings.enable_screenshot_button?.toString() !== "true" || settings.screenshot_save_as?.toString() === "clipboard"}
				id="screenshot_format"
				label={t((translations) => translations.settings.sections.screenshotButton.settings.format.label)}
				onChange={setValueOption("screenshot_format")}
				options={ScreenshotFormatOptions}
				parentSetting={
					settings.enable_screenshot_button?.toString() === "true" && settings.screenshot_save_as?.toString() === "clipboard" ?
						screenshotButtonSaveAsClipboardParentSetting
					:	screenshotButtonParentSetting
				}
				selectedOption={getSelectedOption("screenshot_format")}
				title={t((translations) => translations.settings.sections.screenshotButton.settings.format.title)}
				type="select"
			/>
		</SettingSection>
	);
}
