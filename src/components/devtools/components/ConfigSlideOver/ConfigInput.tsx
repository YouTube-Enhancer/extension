import type { JSX } from "react";

import { HexAlphaColorPicker, HexColorInput } from "react-colorful";

import type { FeatureKeys } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import { CSSEditor } from "@/src/components/Inputs/CSSEditor";
import { evaluateConditions } from "@/src/components/Settings/SettingsGenerator";
import { safeResolve } from "@/src/pipeline/utils";
import { cn } from "@/src/utils/style";

import type { ConfigInputProps } from "./types";

import { isBoolean, isNumber, isString } from "./utils";

export default function ConfigInput<F extends FeatureKeys>({
	allConfigs,
	currentValue,
	onChange,
	setting,
	t
}: ConfigInputProps<F>): JSX.Element | null {
	const configObj = { ...allConfigs } as configuration;
	const isDisabled = evaluateConditions(setting.disabledWhen, configObj, "disabled");
	const disabled = isDisabled;
	const disabledReason = isDisabled ? "Disabled by condition" : undefined;

	const label = safeResolve(setting.label, t);
	switch (setting.component) {
		case "checkbox": {
			const val = isBoolean(currentValue) ? currentValue : false;
			return (
				<label className={cn("flex items-center gap-2", disabled && "opacity-50")} title={disabledReason ?? ""}>
					<input checked={val} disabled={disabled} onChange={(e) => onChange(setting.id, e.target.checked)} type="checkbox" />
					<span className="text-sm text-[#d4d4d4]">{label}</span>
				</label>
			);
		}
		case "color-picker": {
			const val = isString(currentValue) ? currentValue : "#000000";
			return (
				<div className={cn("flex flex-col gap-1", disabled && "opacity-50")} title={disabledReason ?? ""}>
					<label className="text-sm text-[#d4d4d4]">{label}</label>
					<div className="flex flex-col gap-1 rounded border border-[#3c3c3c] bg-[#2d2d2d] p-2">
						<HexAlphaColorPicker color={val} onChange={(color) => onChange(setting.id, color)} style={{ height: "120px", width: "100%" }} />
						<HexColorInput
							alpha
							className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1 text-[#d4d4d4]"
							color={val}
							onChange={(color) => onChange(setting.id, color)}
							prefixed
						/>
					</div>
				</div>
			);
		}
		case "css-editor": {
			const val = isString(currentValue) ? currentValue : "";
			return (
				<div className={cn("flex flex-col gap-1", disabled && "opacity-50")} title={disabledReason ?? ""}>
					<label className="text-sm text-[#d4d4d4]">{label}</label>
					<CSSEditor disabled={disabled} onChange={(value) => onChange(setting.id, value)} t={t} value={val} />
				</div>
			);
		}
		case "number": {
			const val = isNumber(currentValue) ? currentValue : 1;
			return (
				<div className={cn("flex flex-col gap-1", disabled && "opacity-50")} title={disabledReason ?? ""}>
					<label className="text-sm text-[#d4d4d4]">{label}</label>
					<input
						className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
						disabled={disabled}
						max={setting.max}
						min={setting.min}
						onChange={(e) => onChange(setting.id, Number(e.target.value))}
						step={setting.step}
						type="number"
						value={val}
					/>
				</div>
			);
		}
		case "select": {
			const options = setting.optionsFrom ? setting.optionsFrom() : (setting.options ?? []);
			const val =
				isString(currentValue) ? currentValue
				: isNumber(currentValue) ? String(currentValue)
				: isBoolean(currentValue) ? String(currentValue)
				: "";
			return (
				<div className={cn("flex flex-col gap-1", disabled && "opacity-50")} title={disabledReason ?? ""}>
					<label className="text-sm text-[#d4d4d4]">{label}</label>
					<select
						className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
						disabled={disabled}
						onChange={(e) => onChange(setting.id, e.target.value)}
						value={val}
					>
						{options.map((opt) => (
							<option key={opt.value as unknown as string} value={opt.value as unknown as string}>
								{typeof opt.label === "function" ? opt.label(t) : opt.label}
							</option>
						))}
					</select>
				</div>
			);
		}
		case "slider": {
			const val = isNumber(currentValue) ? currentValue : 0;
			return (
				<div className={cn("flex flex-col gap-1", disabled && "opacity-50")} title={disabledReason ?? ""}>
					<label className="flex justify-between text-sm text-[#d4d4d4]">
						<span>{label}</span>
						<span>{String(val)}</span>
					</label>
					<input
						className="w-full"
						disabled={disabled}
						max={setting.max ?? 100}
						min={setting.min ?? 0}
						onChange={(e) => onChange(setting.id, Number(e.target.value))}
						step={setting.step ?? 1}
						type="range"
						value={val}
					/>
				</div>
			);
		}
		case "text-input": {
			const val =
				isString(currentValue) ? currentValue
				: isNumber(currentValue) ? String(currentValue)
				: isBoolean(currentValue) ? String(currentValue)
				: "";
			return (
				<div className={cn("flex flex-col gap-1", disabled && "opacity-50")} title={disabledReason ?? ""}>
					<label className="text-sm text-[#d4d4d4]">{label}</label>
					<input
						className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
						disabled={disabled}
						onChange={(e) => onChange(setting.id, e.target.value)}
						type="text"
						value={val}
					/>
				</div>
			);
		}
		default: {
			setting satisfies never;
			return null;
		}
	}
}
