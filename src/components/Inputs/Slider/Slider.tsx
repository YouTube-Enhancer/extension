import React, { type ChangeEvent, useState } from "react";

import { cn } from "@/src/utils/utilities";

export type SliderProps = {
	disabled: boolean;
	initialValue?: number;
	max: number;
	min: number;
	onChange: (value: ChangeEvent<HTMLInputElement>) => void;
	step: number;
};

const Slider: React.FC<SliderProps> = ({ disabled, initialValue, max, min, onChange, step }) => {
	const [value, setValue] = useState(initialValue ?? 1);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(event.target.value, 10);
		setValue(newValue);
		onChange(event);
	};
	const disabledSliderClasses = { "dark:!text-[#4b5563] !text-[#4b5563] cursor-not-allowed": disabled };
	return (
		<div className="flex items-center">
			<input
				className={cn("slider-thumb h-3 w-full appearance-none rounded bg-gray-300 outline-none", disabledSliderClasses)}
				max={max}
				min={min}
				onChange={handleChange}
				step={step}
				type="range"
				value={value}
			/>
		</div>
	);
};

export default Slider;
