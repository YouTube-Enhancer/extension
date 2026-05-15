import React, { type ChangeEvent, useState } from "react";

import { cn } from "@/src/utils/style";

export type SliderProps = {
	disabled: boolean;
	disabledReason?: string;
	initialValue?: number;
	max: number;
	min: number;
	onChange: (value: ChangeEvent<HTMLInputElement>) => void;
	step: number;
};

const Slider: React.FC<SliderProps> = ({ disabled, disabledReason, initialValue, max, min, onChange, step }) => {
	const [value, setValue] = useState(initialValue ?? 1);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(event.target.value, 10);
		setValue(newValue);
		onChange(event);
	};
	const disabledSliderClasses = { "dark:!text-[#4b5563] !text-[#4b5563] cursor-not-allowed": disabled };
	return (
		<div className="flex flex-col">
			<input
				className={cn("slider-thumb h-3 w-full appearance-none rounded bg-gray-300 outline-none", disabledSliderClasses)}
				max={max}
				min={min}
				onChange={handleChange}
				step={step}
				type="range"
				value={value}
			/>
			{disabled && disabledReason && (
				<span className="cursor-default whitespace-normal break-words text-xs leading-tight text-gray-500 dark:text-gray-300">{disabledReason}</span>
			)}
		</div>
	);
};

export default Slider;
