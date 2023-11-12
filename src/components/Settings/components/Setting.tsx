import { Checkbox, NumberInput, Select, Slider } from "../../Inputs";
import type { CheckboxProps } from "../../Inputs/CheckBox/CheckBox";
import type { NumberInputProps } from "../../Inputs/Number/Number";
import type { SelectProps } from "../../Inputs/Select/Select";
import type { SliderProps } from "../../Inputs/Slider/Slider";

type SettingInputProps = {
	title: string;
} & (
	| ({ type: "checkbox" } & CheckboxProps)
	| ({ type: "number" } & NumberInputProps)
	| ({ type: "slider" } & SliderProps)
	| ({ type: "select" } & SelectProps)
);
function SettingInput(settingProps: SettingInputProps) {
	const { type } = settingProps;
	switch (type) {
		case "checkbox": {
			const { checked, label, onChange, title, className, id } = settingProps;
			return <Checkbox checked={checked} label={label} onChange={onChange} title={title} className={className} id={id} />;
		}
		case "number": {
			const { value, min, max, step, onChange, className, id, label, disabled } = settingProps;
			return (
				<NumberInput
					disabled={disabled}
					value={value}
					min={min}
					max={max}
					step={step}
					onChange={onChange}
					label={label}
					id={id}
					className={className}
				/>
			);
		}
		case "select": {
			const { disabled, label, title, onChange, options, selectedOption, setSelectedOption, className, id } = settingProps;
			return (
				<Select
					disabled={disabled}
					label={label}
					title={title}
					onChange={onChange}
					options={options}
					selectedOption={selectedOption}
					setSelectedOption={setSelectedOption}
					className={className}
					id={id}
				/>
			);
		}
		case "slider": {
			const { max, min, onChange, step, initialValue } = settingProps;
			return <Slider max={max} min={min} onChange={onChange} step={step} initialValue={initialValue} />;
		}
	}
}
export default function Setting(settingProps: SettingInputProps) {
	return (
		<div className="mx-2 mb-1" title={settingProps.title}>
			<SettingInput {...settingProps} />
		</div>
	);
}
