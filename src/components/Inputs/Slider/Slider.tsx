import React, { type ChangeEvent, useState } from "react";

export type SliderProps = {
	min: number;
	max: number;
	initialValue?: number;
	step: number;
	onChange: (value: ChangeEvent<HTMLInputElement>) => void;
};

const Slider: React.FC<SliderProps> = ({ min, max, step, initialValue, onChange }) => {
	const [value, setValue] = useState(initialValue ?? 1);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(event.target.value, 10);
		setValue(newValue);
		onChange(event);
	};

	return (
		<div className="flex items-center">
			<input
				type="range"
				className="slider-thumb appearance-none w-full h-3 rounded bg-gray-300 outline-none"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={handleChange}
			/>
		</div>
	);
};

export default Slider;
