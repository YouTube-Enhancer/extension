import React, { ChangeEvent, MutableRefObject, useRef } from "react";
import "./Number.css";
import Arrow from "./Arrow";
interface NumberInputProps {
	id?: string;
	className?: string;
	label: string;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	disabled: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, min = 0, max = 100, step = 1, onChange, className, id, label, disabled }) => {
	const inputElement: MutableRefObject<HTMLInputElement | null> = useRef(null);

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
		if (min && parseInt(value) < min) value = min + "";
		if (max && parseInt(value) > max) value = max + "";

		if (!isNaN(parseInt(value))) {
			onChange({ currentTarget: { value } } as ChangeEvent<HTMLInputElement>);
		}
	};
	return (
		<div className={`${className ? `${className} ` : ""} relative flex mb-2 gap-4 items-baseline justify-between flex-row`}>
			<label htmlFor={id} className="mb-1">
				{label}
			</label>
			<div className="relative flex flex-row">
				<input
					type="number"
					className={`number border border-gray-300 bg-white text-black px-2 py-2 rounded-md flex items-center justify-between w-40 h-10 focus:outline-none dark:bg-[#23272a] dark:text-white dark:border-gray-700`}
					ref={inputElement}
					aria-hidden={true}
					value={value}
					onChange={(e) => handleChange(e.currentTarget.value)}
					min={min}
					max={max}
					step={step}
					style={{
						WebkitAppearance: "none",
						borderTopLeftRadius: "0.375rem",
						borderBottomLeftRadius: "0.375rem",
						...(disabled ? { color: "#4b5563" } : {})
					}}
					disabled={disabled}
				></input>
				<div className="flex flex-col absolute right-1 bottom-1 h-[35px]">
					<button
						type="button"
						aria-label="Add one"
						className={`flex text-black dark:text-white round-r dark:bg-[#23272a] dark:hover:bg-[rgba(24,26,27,0.5)] w-full h-1/2 p-1 justify-center ${
							!disabled ? "cursor-pointer" : "cursor-default"
						}`}
						style={{
							transition: "all linear 0.1s",
							borderTopRightRadius: "0.375rem",
							...(disabled ? { color: "#4b5563", backgroundColor: "transparent" } : {})
						}}
						aria-hidden={true}
						onClick={NumberPlus}
						disabled={disabled}
					>
						<Arrow rotation="up" />
					</button>
					<button
						type="button"
						aria-label="Subtract one"
						className={`flex text-black dark:text-white round-r dark:bg-[#23272a] dark:hover:bg-[rgba(24,26,27,0.5)] w-full h-1/2 p-1 justify-center ${
							!disabled ? "cursor-pointer" : "cursor-default"
						}`}
						style={{
							transition: "all linear 0.1s",
							borderTopRightRadius: "0.375rem",
							...(disabled ? { color: "#4b5563", backgroundColor: "transparent" } : {})
						}}
						aria-hidden={true}
						onClick={NumberMinus}
						disabled={disabled}
					>
						<Arrow rotation="down" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default NumberInput;
