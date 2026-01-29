import type { configurationId, Nullable, TSelectorFunc } from "@/src/types";

import { useSettings } from "@/src/components/Settings/Settings";
import useSettingsFilter from "@/src/hooks/useSettingsFilter";

import type { CheckboxProps } from "../../Inputs/CheckBox/CheckBox";
import type { ColorPickerProps } from "../../Inputs/ColorPicker/ColorPicker";
import type { CSSEditorProps } from "../../Inputs/CSSEditor/CSSEditor";
import type { NumberInputProps } from "../../Inputs/Number/Number";
import type { SelectProps } from "../../Inputs/Select/Select";
import type { SliderProps } from "../../Inputs/Slider/Slider";
import type { TextInputProps } from "../../Inputs/TextInput/TextInput";

import { Checkbox, ColorPicker, CSSEditor, NumberInput, Select, Slider, TextInput } from "../../Inputs";
export type parentSetting =
	| {
			type: "either" | "plural";
			value: TSelectorFunc[];
	  }
	| {
			type: "singular";
			value: TSelectorFunc;
	  }
	| {
			type: "specificOption";
			value: TSelectorFunc;
	  };
type SettingInputProps<ID extends configurationId> = {
	alwaysVisible?: boolean;
	label?: string;
	parentSetting: Nullable<parentSetting>;
	title?: string;
} & (
	| (CheckboxProps & { type: "checkbox" })
	| (ColorPickerProps & { type: "color-picker" })
	| (CSSEditorProps & { type: "css-editor" })
	| (NumberInputProps & { type: "number" })
	| (SelectProps<ID> & { type: "select" })
	| (SliderProps & { type: "slider" })
	| (TextInputProps & { type: "text-input" })
);
export default function Setting<ID extends configurationId>(settingProps: SettingInputProps<ID>) {
	const { i18nInstance } = useSettings();
	const { t } = i18nInstance;
	const { filter } = useSettingsFilter();
	const shouldSettingBeVisible =
		settingProps.alwaysVisible ?? [settingProps.title, settingProps.label].some((text) => text?.toLowerCase().includes(filter.toLowerCase()));
	return shouldSettingBeVisible ?
			<div
				className="mx-2 mb-1"
				title={(() => {
					const { type: settingType } = settingProps;
					if ((settingType !== "checkbox" && !settingProps.disabled) || !settingProps.parentSetting) {
						return settingProps.title;
					}
					const {
						parentSetting: { type, value }
					} = settingProps;
					if (type === "singular") {
						return t((translations) => translations.pages.options.extras.optionDisabled.singular, {
							OPTION: t(value)
						});
					}
					if (type === "specificOption") {
						return t(value);
					}
					const options = value
						.map((option) => `'${t(option)}'`)
						.join(t((translations) => translations.pages.options.extras.optionDisabled[type].separator));
					return t((translations) => translations.pages.options.extras.optionDisabled[type].label, { OPTIONS: options });
				})()}
			>
				<SettingInput {...settingProps} />
			</div>
		:	null;
}
function SettingInput<ID extends configurationId>(settingProps: SettingInputProps<ID>) {
	const { type } = settingProps;
	switch (type) {
		case "checkbox": {
			const { checked, className, disabled, disabledReason, label, onChange, title } = settingProps;
			return (
				<Checkbox
					checked={checked}
					className={className}
					disabled={disabled}
					disabledReason={disabledReason}
					label={label}
					onChange={onChange}
					title={title}
				/>
			);
		}
		case "color-picker": {
			const { className, disabled, label, onChange, title, value } = settingProps;
			return <ColorPicker className={className} disabled={disabled} label={label} onChange={onChange} title={title} value={value} />;
		}
		case "css-editor": {
			const { className, disabled, onChange, value } = settingProps;
			return <CSSEditor className={className} disabled={disabled} onChange={onChange} value={value} />;
		}
		case "number": {
			const { className, disabled, label, max, min, onChange, step, value } = settingProps;
			return (
				<NumberInput className={className} disabled={disabled} label={label} max={max} min={min} onChange={onChange} step={step} value={value} />
			);
		}
		case "select": {
			const { className, disabled, id, label, loading, onChange, options, selectedOption, title } = settingProps;
			return (
				<Select
					className={className}
					disabled={disabled}
					id={id}
					label={label}
					loading={loading}
					onChange={onChange}
					options={options}
					selectedOption={selectedOption}
					title={title}
				/>
			);
		}
		case "slider": {
			const { disabled, initialValue, max, min, onChange, step } = settingProps;
			return <Slider disabled={disabled} initialValue={initialValue} max={max} min={min} onChange={onChange} step={step} />;
		}
		case "text-input": {
			const { className, disabled, input_type, label, onChange, title, value } = settingProps;
			return (
				<TextInput className={className} disabled={disabled} input_type={input_type} label={label} onChange={onChange} title={title} value={value} />
			);
		}
	}
}
