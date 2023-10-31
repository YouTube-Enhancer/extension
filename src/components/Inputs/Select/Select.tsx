import { useComponentVisible } from "@/hooks";
import React from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import Arrow from "../Number/Arrow";
import { cn } from "@/src/utils/utilities";
import type { ClassValue } from "clsx";

interface SelectOptionProps {
	id?: string;
	value: string;
	className?: string;
	children: React.ReactNode;
}

export type SelectOption = {
	value: string;
	label: string;
	element?: React.ReactElement<SelectOptionProps>;
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

	const disabledButtonClasses = { "text-[#4b5563]": disabled, "dark:text-[#4b5563]": disabled } satisfies ClassValue;
	return (
		<div className={cn("relative flex mb-2 gap-4 flex-row items-baseline justify-between", className)} id={id} ref={selectRef}>
			<label htmlFor={id}>{label}</label>
			<div className="relative inline-block">
				<button
					type="button"
					className={cn(
						"border border-gray-300 bg-white text-black px-2 py-2 rounded-md flex items-center justify-between w-40 h-10 focus:outline-none dark:bg-[#23272a] dark:text-white dark:border-gray-700",
						disabledButtonClasses
					)}
					onClick={toggleSelect}
					key={selectedOption}
					disabled={disabled}
				>
					{selectedOption ? (
						options.find((option) => option.value === selectedOption)?.element ? (
							<div className="flex items-center pr-4 justify-between w-full">
								<span className={cn("text-white", disabledButtonClasses)}>{options.find((option) => option.value === selectedOption)?.label}</span>
								{options.find((option) => option.value === selectedOption)?.element}
							</div>
						) : (
							<div className="flex items-center pr-2 justify-between w-full">
								<span className={cn("text-white", disabledButtonClasses)}>{options.find((option) => option.value === selectedOption)?.label}</span>
							</div>
						)
					) : (
						<span className={cn("text-white", disabledButtonClasses)}>Select an option</span>
					)}
					<Arrow rotation={isSelectVisible ? "up" : "down"} />
				</button>
				{isSelectVisible && (
					<div className="absolute z-10 mt-2 w-40 bg-white dark:bg-[#23272a] border border-gray-300 dark:border-gray-700 rounded-md shadow-lg">
						{options.map((option, index) => (
							<div
								key={option.value}
								className={cn(
									"px-2 py-2 hover:bg-gray-100 dark:hover:bg-[rgba(24,26,27,0.5)] cursor-pointer flex items-center justify-between w-40 focus:outline-none",
									{
										"bg-gray-100 dark:bg-[#2c2f33]": selectedOption === option.value,
										"rounded-t-md": index === 0,
										"rounded-b-md": index === options.length - 1
									}
								)}
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
export { Select };
