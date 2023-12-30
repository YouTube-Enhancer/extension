import type { ClassValue } from "clsx";
import type { ChangeEvent, MutableRefObject } from "react";

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
	const inputElement: MutableRefObject<HTMLInputElement | null> = useRef(null);
	const inputDiv: MutableRefObject<HTMLDivElement | null> = useRef(null);
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
		"cursor-pointer": !disabled,
		"dark:hover:bg-transparent": disabled,
		"dark:text-[#4b5563]": disabled,
		"hover:bg-transparent": disabled,
		"text-[#4b5563]": disabled
	} satisfies ClassValue;
	return (
		<div className={cn("relative flex flex-row items-baseline justify-between gap-4", className)} ref={inputDiv}>
			<label className="mb-1" htmlFor={id}>
				{label}
			</label>
			<div className="relative flex flex-row">
				<input
					aria-hidden={true}
					className={cn(
						"number flex h-10 w-40 items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-black focus:outline-none dark:border-gray-700 dark:bg-[#23272a] dark:text-white",
						{ "dark:text-[#4b5563]": disabled, "text-[#4b5563]": disabled }
					)}
					disabled={disabled}
					id={id}
					max={max}
					min={min}
					onChange={(e) => handleChange(e.currentTarget.value)}
					ref={inputElement}
					step={step}
					style={{
						MozAppearance: "textfield",
						WebkitAppearance: "none",
						borderBottomLeftRadius: "0.375rem",
						borderTopLeftRadius: "0.375rem"
					}}
					type="number"
					value={value}
				></input>
				<div
					className={cn("absolute flex h-[35px] flex-col", {
						"bottom-1 left-1": direction === "rtl",
						"bottom-1 right-1": direction === "ltr"
					})}
				>
					<button
						aria-hidden={true}
						aria-label="Add one"
						className={cn(
							"round-r flex h-1/2 w-full cursor-default justify-center p-1 text-black dark:bg-[#23272a] dark:text-white dark:hover:bg-[rgba(24,26,27,0.5)]",
							disabledButtonClasses
						)}
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
						className={cn(
							"round-r flex h-1/2 w-full cursor-default justify-center p-1 text-black dark:bg-[#23272a] dark:text-white dark:hover:bg-[rgba(24,26,27,0.5)]",
							disabledButtonClasses
						)}
						disabled={disabled}
						onClick={NumberMinus}
						style={{
							borderTopRightRadius: "0.375rem",
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
