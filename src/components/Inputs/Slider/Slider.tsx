import React, { type ChangeEvent, useState } from "react";

export type SliderProps = {
	initialValue?: number;
	max: number;
	min: number;
	onChange: (value: ChangeEvent<HTMLInputElement>) => void;
	step: number;
};

const Slider: React.FC<SliderProps> = ({ initialValue, max, min, onChange, step }) => {
	const [value, setValue] = useState(initialValue ?? 1);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(event.target.value, 10);
		setValue(newValue);
		onChange(event);
	};

	return (
		<div className="flex items-center">
			<input
				className="slider-thumb h-3 w-full appearance-none rounded bg-gray-300 outline-none"
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
