import type { ClassValue } from "clsx";

import type { SelectOption } from "@/src/components/Inputs";

import Setting, { type parentSetting } from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { cn } from "@/src/utils/utilities";

export default function OnScreenDisplaySection() {
	const {
		getSelectedOption,
		i18nInstance: { t },
		settings,
		setValueOption
	} = useSettings();
	const colorDotClassName: ClassValue = "m-2 w-3 h-3 rounded-[50%] border-DEFAULT border-solid border-black";
	const colorOptions: SelectOption<"onScreenDisplay.color">[] = [
		{
			element: <div className={cn(colorDotClassName, "bg-[red]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.red),
			value: "red"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[green]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.green),
			value: "green"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[blue]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.blue),
			value: "blue"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[yellow]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.yellow),
			value: "yellow"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[orange]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.orange),
			value: "orange"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[purple]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.purple),
			value: "purple"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[pink]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.pink),
			value: "pink"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[white]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.white),
			value: "white"
		}
	];
	const OSD_DisplayTypeOptions: SelectOption<"onScreenDisplay.type">[] = [
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.select.options.no_display),
			value: "no_display"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.select.options.text),
			value: "text"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.select.options.line),
			value: "line"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.select.options.circle),
			value: "circle"
		}
	];
	const OSD_PositionOptions: SelectOption<"onScreenDisplay.position">[] = [
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.top_left),
			value: "top_left"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.top_right),
			value: "top_right"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.bottom_left),
			value: "bottom_left"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.bottom_right),
			value: "bottom_right"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.center),
			value: "center"
		}
	];
	// FIXME: Update to be configurable when volume boost button is enabled or just allow configuration always
	const isOSDDisabled =
		settings.scrollWheelVolumeControl.enabled?.toString() !== "true" && settings.scrollWheelSpeedControl.enabled?.toString() !== "true";
	const osdParentSetting = {
		type: "either",
		value: [
			(translations) => translations.settings.sections.scrollWheelVolumeControl.enable.label,
			(translations) => translations.settings.sections.scrollWheelSpeedControl.enable.label
		]
	} satisfies parentSetting;
	return (
		<SettingSection title={t((translations) => translations.settings.sections.onScreenDisplaySettings.title)}>
			<SettingTitle />
			<Setting
				disabled={isOSDDisabled}
				id="onScreenDisplay.color"
				label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.label)}
				onChange={setValueOption("onScreenDisplay.color")}
				options={colorOptions}
				parentSetting={osdParentSetting}
				selectedOption={getSelectedOption("onScreenDisplay.color")}
				title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.title)}
				type="select"
			/>
			<Setting
				disabled={isOSDDisabled}
				id="onScreenDisplay.type"
				label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.label)}
				onChange={setValueOption("onScreenDisplay.type")}
				options={OSD_DisplayTypeOptions}
				parentSetting={osdParentSetting}
				selectedOption={getSelectedOption("onScreenDisplay.type")}
				title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.title)}
				type="select"
			/>
			<Setting
				disabled={isOSDDisabled}
				id="onScreenDisplay.position"
				label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.label)}
				onChange={setValueOption("onScreenDisplay.position")}
				options={OSD_PositionOptions}
				parentSetting={osdParentSetting}
				selectedOption={getSelectedOption("onScreenDisplay.position")}
				title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.title)}
				type="select"
			/>
			<Setting
				disabled={isOSDDisabled}
				label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.opacity.label)}
				max={100}
				min={1}
				onChange={setValueOption("onScreenDisplay.opacity")}
				parentSetting={osdParentSetting}
				title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.opacity.title)}
				type="number"
				value={settings.onScreenDisplay.opacity}
			/>
			<Setting
				disabled={isOSDDisabled}
				label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.hide.label)}
				min={1}
				onChange={setValueOption("onScreenDisplay.hideTime")}
				parentSetting={osdParentSetting}
				title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.hide.title)}
				type="number"
				value={settings.onScreenDisplay.hideTime}
			/>
			<Setting
				disabled={isOSDDisabled}
				label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.padding.label)}
				min={0}
				onChange={setValueOption("onScreenDisplay.padding")}
				parentSetting={osdParentSetting}
				title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.padding.title)}
				type="number"
				value={settings.onScreenDisplay.padding}
			/>
		</SettingSection>
	);
}
