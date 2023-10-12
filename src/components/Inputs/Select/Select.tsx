import { useComponentVisible } from "@/hooks";
import React from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import Arrow from "../Number/Arrow";

interface OptionProps {
	value: string;
	id?: string;
	className?: string;
	children: React.ReactNode;
}

const Option: React.FC<OptionProps> = ({ value, children }) => {
	return (
		<div className={`flex items-center ${value === "light" ? "text-gray-900" : "text-gray-100"}`}>
			<div className={`rounded-full h-4 w-4 mr-2 bg-[${value}]`}></div>
			<span>{children}</span>
		</div>
	);
};

export type SelectOption = {
	value: string;
	label: string;
	element?: React.ReactElement<OptionProps>;
};

interface SelectProps {
	id?: string;
	className?: string;
	options: SelectOption[];
	onChange: (value: ChangeEvent<HTMLSelectElement>) => void;
	label: string;
	selectedOption: string | undefined;
	setSelectedOption: Dispatch<SetStateAction<string | undefined>>;
	disabled: boolean;
}

const Select: React.FC<SelectProps> = ({ onChange, options, className, id, selectedOption, label, setSelectedOption, disabled }) => {
	const {
		ref: selectRef,
		isComponentVisible: isSelectVisible,
		setIsComponentVisible: setIsSelectVisible
	} = useComponentVisible<HTMLDivElement>(false);

	const toggleSelect = () => {
		setIsSelectVisible(!isSelectVisible);
	};

	const handleOptionSelect = (option: string) => {
		setSelectedOption(option);
		setIsSelectVisible(false);
		onChange({ currentTarget: { value: option } } as ChangeEvent<HTMLSelectElement>);
	};

	return (
		<div
			className={`relative flex flex-row${className ? ` ${className}` : ""} mb-2 gap-4 flex-row items-baseline justify-between`}
			id={id}
			ref={selectRef}
		>
			<label htmlFor={id}>{label}</label>
			<div className="relative inline-block">
				<button
					type="button"
					className="border border-gray-300 bg-white text-black px-2 py-2 rounded-md flex items-center justify-between w-40 h-10 focus:outline-none dark:bg-[#23272a] dark:text-white dark:border-gray-700"
					onClick={toggleSelect}
					key={selectedOption}
					disabled={disabled}
					style={{
						...(disabled ? { color: "#4b5563" } : {})
					}}
				>
					{selectedOption ? (
						options.find((option) => option.value === selectedOption)?.element ? (
							<div className="flex items-center pr-4 justify-between w-full">
								<span
									className="text-white"
									style={{
										...(disabled ? { color: "#4b5563" } : {})
									}}
								>
									{options.find((option) => option.value === selectedOption)?.label}
								</span>
								{options.find((option) => option.value === selectedOption)?.element}
							</div>
						) : (
							<div className="flex items-center pr-2 justify-between w-full">
								<span
									className="text-white"
									style={{
										...(disabled ? { color: "#4b5563" } : {})
									}}
								>
									{options.find((option) => option.value === selectedOption)?.label}
								</span>
							</div>
						)
					) : (
						<span
							className="text-white"
							style={{
								...(disabled ? { color: "#4b5563" } : {})
							}}
						>
							Select an option
						</span>
					)}
					<Arrow rotation={isSelectVisible ? "up" : "down"} />
				</button>
				{isSelectVisible && (
					<div className="absolute z-10 mt-2 w-40 bg-white dark:bg-[#23272a] border border-gray-300 dark:border-gray-700 rounded-md shadow-lg">
						{options.map((option, index) => (
							<div
								key={option.value}
								className={`px-2 py-2 hover:bg-gray-100 dark:hover:bg-[rgba(24,26,27,0.5)] cursor-pointer${
									selectedOption === option.value ? " bg-gray-100 dark:bg-[#2c2f33] " : ""
								}flex items-center justify-between w-40 focus:outline-none${
									index === 0 ? " rounded-t-md" : index === options.length - 1 ? " rounded-b-md" : ""
								}`}
								onClick={() => handleOptionSelect(option.value)}
							>
								<div className="flex items-center pr-8 justify-between w-full">
									<span>{option.label}</span>
									{option.element}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export { Option, Select };
