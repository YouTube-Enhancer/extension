import type { ClassValue } from "clsx";
import type { ChangeEvent } from "react";

import { useComponentVisible } from "@/hooks";
import { cn } from "@/src/utils/utilities";
import React from "react";

import Loader from "../../Loader";
import Arrow from "../Number/Arrow";

interface SelectOptionProps {
	children: React.ReactNode;
	className?: string;
	id?: string;
	value: string;
}

export type SelectOption = {
	element?: React.ReactElement<SelectOptionProps>;
	label: string;
	value: string;
};

export type SelectProps = {
	className?: string;
	disabled?: boolean;
	id?: string;
	label: string;
	loading?: boolean;
	onChange: (value: ChangeEvent<HTMLSelectElement>) => void;
	options: SelectOption[];
	selectedOption: string | undefined;
	title: string;
};

const Select: React.FC<SelectProps> = ({ className, disabled = false, id, label, loading = false, onChange, options, selectedOption }) => {
	const {
		isComponentVisible: isSelectVisible,
		ref: selectRef,
		setIsComponentVisible: setIsSelectVisible
	} = useComponentVisible<HTMLDivElement>(false);

	const toggleSelect = () => {
		setIsSelectVisible(!isSelectVisible);
	};

	const handleOptionSelect = (option: string) => {
		setIsSelectVisible(false);
		onChange({ currentTarget: { value: option } } as ChangeEvent<HTMLSelectElement>);
	};

	const disabledButtonClasses = { "dark:text-[#4b5563] text-[#4b5563]": disabled } satisfies ClassValue;
	return (
		<div
			aria-valuetext={selectedOption}
			className={cn("relative flex flex-row items-baseline justify-between gap-4", className)}
			id={id}
			ref={selectRef}
		>
			<label htmlFor={id}>{label}</label>
			<div className="relative inline-block">
				<>
					<button
						className={cn(
							"flex h-10 w-40 items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-black focus:outline-none dark:border-gray-700 dark:bg-[#23272a] dark:text-white",
							disabledButtonClasses
						)}
						disabled={loading || disabled}
						key={selectedOption}
						onClick={toggleSelect}
						type="button"
					>
						{loading ?
							<Loader className={"h-4 w-4"} />
						: selectedOption ?
							options.find((option) => option.value === selectedOption)?.element ?
								<div className="flex w-full items-center justify-between pr-4">
									<span className={cn("text-black dark:text-white", disabledButtonClasses)}>
										{options.find((option) => option.value === selectedOption)?.label}
									</span>
									{options.find((option) => option.value === selectedOption)?.element}
								</div>
							:	<div className="flex w-full items-center justify-between pr-2">
									<span className={cn("text-black dark:text-white", disabledButtonClasses)}>
										{options.find((option) => option.value === selectedOption)?.label}
									</span>
								</div>

						:	<span className={cn("text-black dark:text-white", disabledButtonClasses)}>Select an option</span>}
						<Arrow rotation={isSelectVisible ? "up" : "down"} />
					</button>
					{isSelectVisible && (
						<div className="absolute z-10 mt-2 w-40 rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-[#23272a]">
							{options.map((option, index) => (
								<div
									aria-valuetext={option.value}
									className={cn(
										"flex w-40 cursor-pointer items-center justify-between p-2 hover:bg-gray-100 focus:outline-none dark:hover:bg-[rgba(24,26,27,0.5)]",
										{
											"bg-gray-100 dark:bg-[#2c2f33]": selectedOption === option.value,
											"rounded-b-md": index === options.length - 1,
											"rounded-t-md": index === 0
										}
									)}
									key={option.value}
									onClick={() => handleOptionSelect(option.value)}
								>
									<div className="flex w-full items-center justify-between pr-8">
										<span>{option.label}</span>
										{option.element}
									</div>
								</div>
							))}
						</div>
					)}
				</>
			</div>
		</div>
	);
};
export default Select;
