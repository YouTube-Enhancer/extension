import type { configurationId } from "@/src/types";

import useSectionTitle from "@/src/hooks/useSectionTitle";
import useSettingsFilter from "@/src/hooks/useSettingsFilter";

import type { CheckboxProps } from "../../Inputs/CheckBox/CheckBox";
import type { ColorPickerProps } from "../../Inputs/ColorPicker/ColorPicker";
import type { CSSEditorProps } from "../../Inputs/CSSEditor/CSSEditor";
import type { NumberInputProps } from "../../Inputs/Number/Number";
import type { SelectProps } from "../../Inputs/Select/Select";
import type { SliderProps } from "../../Inputs/Slider/Slider";
import type { TextInputProps } from "../../Inputs/TextInput/TextInput";

import { Checkbox, ColorPicker, CSSEditor, NumberInput, Select, Slider, TextInput } from "../../Inputs";

type SettingInputProps<ID extends configurationId> = {
	id: ID;
	label?: string;
	title?: string;
} & (
	| ({ type: "checkbox" } & CheckboxProps)
	| ({ type: "color-picker" } & ColorPickerProps)
	| ({ type: "css-editor" } & CSSEditorProps)
	| ({ type: "number" } & NumberInputProps)
	| ({ type: "select" } & SelectProps<ID>)
	| ({ type: "slider" } & SliderProps)
	| ({ type: "text-input" } & TextInputProps)
);
function SettingInput<ID extends configurationId>(settingProps: SettingInputProps<ID>) {
	const { type } = settingProps;
	switch (type) {
		case "checkbox": {
			const { checked, className, id, label, onChange, title } = settingProps;
			return <Checkbox checked={checked} className={className} id={id} label={label} onChange={onChange} title={title} />;
		}
		case "number": {
			const { className, disabled, id, label, max, min, onChange, step, value } = settingProps;
			return (
				<NumberInput
					className={className}
					disabled={disabled}
					id={id}
					label={label}
					max={max}
					min={min}
					onChange={onChange}
					step={step}
					value={value}
				/>
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
			const { initialValue, max, min, onChange, step } = settingProps;
			return <Slider initialValue={initialValue} max={max} min={min} onChange={onChange} step={step} />;
		}
		case "css-editor": {
			const { className, id, onChange, value } = settingProps;
			return <CSSEditor className={className} id={id} onChange={onChange} value={value} />;
		}
		case "color-picker": {
			const { className, disabled, id, label, onChange, title, value } = settingProps;
			return <ColorPicker className={className} disabled={disabled} id={id} label={label} onChange={onChange} title={title} value={value} />;
		}
		case "text-input": {
			const { className, id, input_type, label, onChange, title, value } = settingProps;
			return <TextInput className={className} id={id} input_type={input_type} label={label} onChange={onChange} title={title} value={value} />;
		}
	}
}
export default function Setting<ID extends configurationId>(settingProps: SettingInputProps<ID>) {
	const { filter } = useSettingsFilter();
	const { title } = useSectionTitle();
	const shouldSettingBeVisible =
		filter === "" ? true : (
			(title && title.toLowerCase().includes(filter.toLowerCase())) ||
			(settingProps.title !== undefined && settingProps.title.toLowerCase().includes(filter.toLowerCase())) ||
			(settingProps.label !== undefined && settingProps.label.toLowerCase().includes(filter.toLowerCase()))
		);
	return shouldSettingBeVisible ?
			<div className="mx-2 mb-1" title={settingProps.title}>
				<SettingInput {...settingProps} />
			</div>
		:	null;
}
