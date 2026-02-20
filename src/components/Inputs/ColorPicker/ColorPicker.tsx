import type { ClassValue } from "clsx";

import React, { type ChangeEvent, useRef } from "react";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";

import { useComponentVisible } from "@/src/hooks";

import "./index.css";

import useClickOutside from "@/src/hooks/useClickOutside";
import useDebounceFn from "@/src/hooks/useDebounce";
import { cn } from "@/src/utils/utilities";
export type ColorPickerProps = {
	className?: string;
	disabled: boolean;
	label: string;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	title: string;
	value: string;
};

const ColorPicker: React.FC<ColorPickerProps> = ({ className, disabled, label, onChange, value }) => {
	const handleChange = useDebounceFn((value: string) => onChange({ currentTarget: { value } } as ChangeEvent<HTMLInputElement>), 200);
	const colorPickerRef = useRef(null);
	const { isComponentVisible: isColorPickerVisible, setIsComponentVisible: setIsColorPickerVisible } = useComponentVisible<HTMLDivElement>(
		colorPickerRef,
		false
	);
	const togglePickerVisibility = () => setIsColorPickerVisible(!isColorPickerVisible);
	useClickOutside(colorPickerRef, () => (isColorPickerVisible ? togglePickerVisibility() : void 0));
	const disabledPickerClasses = {
		"cursor-not-allowed": disabled,
		"cursor-pointer": !disabled
	} satisfies ClassValue;
	return (
		<div aria-valuetext={value} className={cn("relative flex flex-row items-baseline justify-between gap-4", className)}>
			<label
				style={{
					transform: "translateY(-10px)"
				}}
			>
				{label}
			</label>
			<div ref={colorPickerRef}>
				<button
					className={cn(
						"flex h-10 w-40 items-center justify-between rounded-md border border-gray-300 bg-white p-1 text-black focus:outline-none dark:multi-['border-gray-700;bg-[#23272a];text-white']",
						disabledPickerClasses
					)}
					disabled={disabled}
					onClick={disabled ? () => void 0 : togglePickerVisibility}
					type="button"
				>
					<div
						// eslint-disable-next-line tailwindcss/enforces-shorthand
						className="h-full w-full rounded-md border border-neutral-500"
						style={{
							backgroundColor: value
						}}
					/>
				</button>
				{isColorPickerVisible && (
					<div className="z-10 mt-1 w-40 rounded-md border border-gray-300 bg-white shadow-lg dark:multi-['border-gray-700;bg-[#23272a]']">
						<HexAlphaColorPicker color={value} onChange={handleChange} />
						<HexColorInput
							alpha
							className="!bg-white !text-black dark:multi-['!bg-[#23272a];!text-white']"
							color={value}
							id="color-picker-input"
							onChange={handleChange}
							prefixed
						/>
					</div>
				)}
			</div>
		</div>
	);
};
export default ColorPicker;
