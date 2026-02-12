import type { ClassValue } from "clsx";
import type { ChangeEvent } from "react";

import React, { useEffect, useId, useRef, useState } from "react";

import useDebounceFn from "@/src/hooks/useDebounce";
import { type Nullable } from "@/src/types";
import { cn } from "@/src/utils/utilities";

import { useSettings } from "../../Settings/Settings";
import Arrow from "./Arrow";
import "./Number.css";
export type NumberInputProps = {
	className?: string;
	disabled: boolean;
	label: string;
	max?: number;
	min?: number;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	step?: number;
	value: number;
};

const NumberInput: React.FC<NumberInputProps> = ({ className, disabled, label, max = undefined, min = 0, onChange, step = 1, value }) => {
	const inputElement = useRef<Nullable<HTMLInputElement>>(null);
	const inputDiv = useRef<Nullable<HTMLDivElement>>(null);
	const id = useId();
	const { direction } = useSettings();
	const [localValue, setLocalValue] = useState<string>(value.toString());
	useEffect(() => {
		setLocalValue(value.toString());
	}, [value]);
	const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		setLocalValue(e.currentTarget.value);
		debouncedChange(e.currentTarget.value);
	};
	const updateNumber = (action: "down" | "up") => {
		if (!inputElement.current) return;
		if (action === "up") inputElement.current.stepUp();
		if (action === "down") inputElement.current.stepDown();
		const {
			current: { value }
		} = inputElement;
		setLocalValue(value);
		debouncedChange(value);
	};
	const NumberPlus = () => updateNumber("up");
	const NumberMinus = () => updateNumber("down");
	const handleChange = (value: string) => {
		if (min && parseFloat(value) < min) value = min + "";
		if (max && parseFloat(value) > max) value = max + "";
		if (!isNaN(parseFloat(value))) {
			setLocalValue(value);
			onChange({ currentTarget: { value } } as ChangeEvent<HTMLInputElement>);
		}
	};
	const debouncedChange = useDebounceFn(handleChange, 300);
	const disabledButtonClasses = {
		"!text-[#4b5563]": disabled,
		"cursor-not-allowed": disabled,
		"cursor-pointer": !disabled,
		"dark:!text-[#4b5563]": disabled
	} satisfies ClassValue;
	const buttonClasses =
		"flex h-1/2 w-full cursor-default justify-center p-1 items-center text-black hover:bg-[rgba(24,26,27,0.5)] dark:bg-[#23272a] dark:text-white" satisfies ClassValue;
	return (
		<div className={cn("relative flex flex-row items-baseline justify-between gap-4", className)} ref={inputDiv}>
			<label className="mb-1" htmlFor={id}>
				{label}
			</label>
			<div className="relative flex flex-row">
				<input
					className={cn(
						"flex h-10 w-40 items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-black focus:outline-none dark:multi-['border-gray-700;bg-[#23272a];text-white']",
						disabledButtonClasses
					)}
					disabled={disabled}
					id={id}
					max={max}
					min={min}
					onChange={onInputChange}
					ref={inputElement}
					step={step}
					style={{
						borderBottomLeftRadius: "0.375rem",
						borderTopLeftRadius: "0.375rem"
					}}
					type="number"
					value={localValue}
				></input>
				<div
					className={cn("absolute bottom-px flex h-[38px] flex-col", {
						"left-[1px]": direction === "rtl",
						"right-[1px]": direction === "ltr"
					})}
				>
					<button
						aria-label="Add one"
						className={cn(buttonClasses, disabledButtonClasses)}
						disabled={disabled}
						onClick={NumberPlus}
						style={{
							borderTopRightRadius: "0.375rem",
							transition: "all linear 0.1s"
						}}
						type="button"
					>
						<Arrow rotation="up" />
					</button>
					<button
						aria-label="Subtract one"
						className={cn(buttonClasses, disabledButtonClasses)}
						disabled={disabled}
						onClick={NumberMinus}
						style={{
							borderBottomRightRadius: "0.375rem",
							transition: "all linear 0.1s"
						}}
						type="button"
					>
						<Arrow rotation="down" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default NumberInput;
