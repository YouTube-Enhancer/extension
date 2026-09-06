import type { CheckboxProps } from "@/src/components/Inputs/CheckBox/CheckBox";
import type { ColorPickerProps } from "@/src/components/Inputs/ColorPicker/ColorPicker";
import type { CSSEditorProps } from "@/src/components/Inputs/CSSEditor/CSSEditor";
import type { FileNameTemplateProps } from "@/src/components/Inputs/FileNameTemplate/FileNameTemplate";
import type { KeyValueListProps } from "@/src/components/Inputs/KeyValueList/KeyValueList";
import type { NumberInputProps } from "@/src/components/Inputs/Number/Number";
import type { SelectProps } from "@/src/components/Inputs/Select/Select";
import type { SliderProps } from "@/src/components/Inputs/Slider/Slider";
import type { StringListProps } from "@/src/components/Inputs/StringList/StringList";
import type { TextInputProps } from "@/src/components/Inputs/TextInput/TextInput";
import type { configurationId, Nullable, TSelectorFunc } from "@/src/types";

import {
	Checkbox,
	ColorPicker,
	CSSEditor,
	FileNameTemplate,
	KeyValueList,
	NumberInput,
	Select,
	Slider,
	StringList,
	TextInput
} from "@/src/components/Inputs";
import { useSettings } from "@/src/components/Settings/Settings";
import useSettingsFilter from "@/src/hooks/useSettingsFilter";
import { textMatcher } from "@/src/utils/string";
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
export type SettingInputProps<ID extends configurationId> = (
	| (CheckboxProps & { type: "checkbox" })
	| (ColorPickerProps & { type: "color-picker" })
	| (CSSEditorProps & { type: "css-editor" })
	| (FileNameTemplateProps & { type: "file-name-template" })
	| (KeyValueListProps & { type: "key-value-list" })
	| (NumberInputProps & { type: "number" })
	| (SelectProps<ID> & { type: "select" })
	| (SliderProps & { type: "slider" })
	| (StringListProps & { type: "string-list" })
	| (TextInputProps & { type: "text-input" })
) & {
	alwaysVisible?: boolean;
	disabledReason?: string;
	featureId?: string;
	label?: string;
	parentSetting: Nullable<parentSetting>;
	title?: string;
};
export default function Setting<ID extends configurationId>(settingProps: SettingInputProps<ID>) {
	const { i18nInstance } = useSettings();
	const { t } = i18nInstance;
	const { filter } = useSettingsFilter();
	const matchesText = textMatcher(filter);
	const shouldSettingBeVisible =
		settingProps.alwaysVisible ||
		filter === "" ||
		matchesText(settingProps.featureId ?? "") ||
		[settingProps.title, settingProps.label].some((text) => matchesText(text ?? ""));
	return shouldSettingBeVisible ?
			<div
				className="mx-2 mb-1"
				title={(() => {
					const { disabled, disabledReason, parentSetting, type: settingType } = settingProps;
					if ((settingType !== "checkbox" && !disabled) || !parentSetting) {
						return settingProps.title;
					}
					if (disabledReason) {
						return disabledReason;
					}
					if (parentSetting.type === "singular") {
						return t((translations) => translations.pages.options.extras.optionDisabled.singular, {
							OPTION: t(parentSetting.value)
						});
					}
					if (parentSetting.type === "specificOption") {
						return t(parentSetting.value);
					}
					const options = parentSetting.value
						.map((option) => `'${t(option)}'`)
						.join(t((translations) => translations.pages.options.extras.optionDisabled[parentSetting.type].separator));
					return t((translations) => translations.pages.options.extras.optionDisabled[parentSetting.type].label, { OPTIONS: options });
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
			const { className, disabled, disabledReason, label, onChange, title, value } = settingProps;
			return (
				<ColorPicker
					className={className}
					disabled={disabled}
					disabledReason={disabledReason}
					label={label}
					onChange={onChange}
					title={title}
					value={value}
				/>
			);
		}
		case "css-editor": {
			const { className, disabled, disabledReason, onChange, value } = settingProps;
			return <CSSEditor className={className} disabled={disabled} disabledReason={disabledReason} onChange={onChange} value={value} />;
		}
		case "file-name-template": {
			const { className, disabled, disabledReason, error, hint, label, onChange, placeholdersLabel, title, value } = settingProps;
			return (
				<FileNameTemplate
					className={className}
					disabled={disabled}
					disabledReason={disabledReason}
					error={error}
					hint={hint}
					label={label}
					onChange={onChange}
					placeholdersLabel={placeholdersLabel}
					title={title}
					value={value}
				/>
			);
		}
		case "key-value-list": {
			const {
				addLabel,
				channelIdLabel,
				className,
				disabled,
				disabledReason,
				getChannelIdFromLinkLabel,
				label,
				max,
				min,
				onChange,
				pasteLinkPlaceholder,
				removeLabel,
				speedLabel,
				step,
				title,
				value
			} = settingProps;
			return (
				<KeyValueList
					addLabel={addLabel}
					channelIdLabel={channelIdLabel}
					className={className}
					disabled={disabled}
					disabledReason={disabledReason}
					getChannelIdFromLinkLabel={getChannelIdFromLinkLabel}
					label={label}
					max={max}
					min={min}
					onChange={onChange}
					pasteLinkPlaceholder={pasteLinkPlaceholder}
					removeLabel={removeLabel}
					speedLabel={speedLabel}
					step={step}
					title={title}
					value={value}
				/>
			);
		}
		case "number": {
			const { className, disabled, disabledReason, label, max, min, onChange, step, value } = settingProps;
			return (
				<NumberInput
					className={className}
					disabled={disabled}
					disabledReason={disabledReason}
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
			const { className, disabled, disabledReason, id, label, loading, onChange, options, selectedOption, title } = settingProps;
			return (
				<Select
					className={className}
					disabled={disabled}
					disabledReason={disabledReason}
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
			const { disabled, disabledReason, initialValue, max, min, onChange, step } = settingProps;
			return (
				<Slider disabled={disabled} disabledReason={disabledReason} initialValue={initialValue} max={max} min={min} onChange={onChange} step={step} />
			);
		}
		case "string-list": {
			const { addLabel, className, disabled, disabledReason, itemLabel, label, max, onChange, removeLabel, title, value } = settingProps;
			return (
				<StringList
					addLabel={addLabel}
					className={className}
					disabled={disabled}
					disabledReason={disabledReason}
					itemLabel={itemLabel}
					label={label}
					max={max}
					onChange={onChange}
					removeLabel={removeLabel}
					title={title}
					value={value}
				/>
			);
		}
		case "text-input": {
			const { className, disabled, disabledReason, input_type, label, onChange, title, value } = settingProps;
			return (
				<TextInput
					className={className}
					disabled={disabled}
					disabledReason={disabledReason}
					input_type={input_type}
					label={label}
					onChange={onChange}
					title={title}
					value={value}
				/>
			);
		}
	}
}
