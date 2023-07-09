import { useComponentVisible } from "@/hooks";
import React, { ChangeEvent, Dispatch, SetStateAction } from "react";
import Arrow from "./Arrow";

interface CustomOptionProps {
	value: string;
	id?: string;
	className?: string;
	children: React.ReactNode;
}

const CustomOption: React.FC<CustomOptionProps> = ({ value, children }) => {
	return (
		<div className={`flex items-center ${value === "light" ? "text-gray-900" : "text-gray-100"}`}>
			<div className={`rounded-full h-4 w-4 mr-2 bg-[${value}]`}></div>
			<span>{children}</span>
		</div>
	);
};

export type CustomSelectOption = {
	value: string;
	label: string;
	element?: React.ReactElement<CustomOptionProps>;
};

interface CustomSelectProps {
	id?: string;
	className?: string;
	options: CustomSelectOption[];
	onChange: (value: ChangeEvent<HTMLSelectElement>) => void;
	label: string;
	selectedOption: string | undefined;
	setSelectedOption: Dispatch<SetStateAction<string | undefined>>;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ onChange, options, className, id, selectedOption, label, setSelectedOption }) => {
	const {
		ref: customSelectRef,
		isComponentVisible: isCustomSelectVisible,
		setIsComponentVisible: setIsCustomSelectVisible
	} = useComponentVisible<HTMLDivElement>(false);

	const toggleSelect = () => {
		setIsCustomSelectVisible(!isCustomSelectVisible);
	};

	const handleOptionSelect = (option: string) => {
		setSelectedOption(option);
		setIsCustomSelectVisible(false);
		onChange({ currentTarget: { value: option } } as ChangeEvent<HTMLSelectElement>);
	};

	return (
		<div
			className={`relative flex flex-row${className ? ` ${className}` : ""} mb-2 gap-4 flex-row items-baseline justify-between`}
			id={id}
			ref={customSelectRef}
		>
			<label htmlFor={id}>{label}</label>
			<div className="relative inline-block">
				<button
					type="button"
					className="border border-gray-300 bg-white text-black px-2 py-2 rounded-md flex items-center justify-between w-40 h-10 focus:outline-none dark:bg-[#23272a] dark:text-white dark:border-gray-700"
					onClick={toggleSelect}
					key={selectedOption}
				>
					{selectedOption ? (
						options.find((option) => option.value === selectedOption)?.element ? (
							<div className="flex items-center pr-4 justify-between w-full">
								<span className="text-white">{options.find((option) => option.value === selectedOption)?.label}</span>
								{options.find((option) => option.value === selectedOption)?.element}
							</div>
						) : (
							<div className="flex items-center pr-2 justify-between w-full">
								<span className="text-white">{options.find((option) => option.value === selectedOption)?.label}</span>
							</div>
						)
					) : (
						<span className="text-gray-500">Select an option</span>
					)}
					<Arrow rotation={isCustomSelectVisible ? "up" : "down"} />
				</button>
				{isCustomSelectVisible && (
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

export { CustomSelect, CustomOption };
