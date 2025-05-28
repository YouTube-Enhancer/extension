import type { ClassValue } from "clsx";
import type { ChangeEvent } from "react";

import { type Nullable } from "@/src/types";
import { cn } from "@/src/utils/utilities";
import React, { useRef } from "react";

import { useSettings } from "../../Settings/Settings";
import Arrow from "./Arrow";
import "./Number.css";
export type NumberInputProps = {
	className?: string;
	disabled: boolean;
	id?: string;
	label: string;
	max?: number;
	min?: number;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	step?: number;
	value: number;
};

const NumberInput: React.FC<NumberInputProps> = ({ className, disabled, id, label, max = undefined, min = 0, onChange, step = 1, value }) => {
	const inputElement = useRef<Nullable<HTMLInputElement>>(null);
	const inputDiv = useRef<Nullable<HTMLDivElement>>(null);
	const { direction } = useSettings();
	const NumberPlus = () => {
		if (inputElement.current) {
			inputElement.current.stepUp();
			handleChange(inputElement.current.value);
		}
	};

	const NumberMinus = () => {
		if (inputElement.current) {
			inputElement.current.stepDown();
			handleChange(inputElement.current.value);
		}
	};

	const handleChange = (value: string) => {
		if (min && parseFloat(value) < min) value = min + "";
		if (max && parseFloat(value) > max) value = max + "";

		if (!isNaN(parseFloat(value))) {
			onChange({ currentTarget: { value } } as ChangeEvent<HTMLInputElement>);
		}
	};

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
					aria-hidden={true}
					className={cn(
						"flex h-10 w-40 items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-black focus:outline-none dark:multi-['border-gray-700;bg-[#23272a];text-white']",
						disabledButtonClasses
					)}
					disabled={disabled}
					id={id}
					max={max}
					min={min}
					onChange={(e) => handleChange(e.currentTarget.value)}
					ref={inputElement}
					step={step}
					style={{
						borderBottomLeftRadius: "0.375rem",
						borderTopLeftRadius: "0.375rem"
					}}
					type="number"
					value={value}
				></input>
				<div
					className={cn("absolute bottom-px flex h-[38px] flex-col", {
						"left-[1px]": direction === "rtl",
						"right-[1px]": direction === "ltr"
					})}
				>
					<button
						aria-hidden={true}
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
						aria-hidden={true}
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
