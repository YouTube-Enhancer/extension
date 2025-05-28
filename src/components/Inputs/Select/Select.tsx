import type { configuration, configurationId, PathValue } from "@/src/types";
import type { ClassValue } from "clsx";
import type { ChangeEvent } from "react";

import { useComponentVisible } from "@/hooks";
import { cn } from "@/src/utils/utilities";
import React, { useRef } from "react";

import Loader from "../../Loader";
import Arrow from "../Number/Arrow";

export type SelectOption<Key extends configurationId> = {
	element?: React.ReactElement<SelectOptionProps>;
	label: string;
	value: Extract<PathValue<configuration, Key>, string>;
};
export type SelectProps<Key extends configurationId> = {
	className?: string;
	disabled?: boolean;
	id?: string;
	label: string;
	loading?: boolean;
	onChange: (value: ChangeEvent<HTMLSelectElement>) => void;
	options: SelectOption<Key>[];
	selectedOption: string | undefined;
	title: string;
};

interface SelectOptionProps {
	children: React.ReactNode;
	className?: string;
	id?: string;
	value: string;
}

const Select = <Key extends configurationId>({
	className,
	disabled = false,
	id,
	label,
	loading = false,
	onChange,
	options,
	selectedOption
}: SelectProps<Key>) => {
	const selectRef = useRef<HTMLDivElement>(null);
	const { isComponentVisible: isSelectVisible, setIsComponentVisible: setIsSelectVisible } = useComponentVisible<HTMLDivElement>(selectRef, false);

	const toggleSelect = () => {
		setIsSelectVisible(!isSelectVisible);
	};

	const handleOptionSelect = (option: string) => {
		setIsSelectVisible(false);
		onChange({ currentTarget: { value: option } } as ChangeEvent<HTMLSelectElement>);
	};

	const disabledButtonClasses = { "dark:!text-[#4b5563] !text-[#4b5563] cursor-not-allowed": disabled } satisfies ClassValue;
	return (
		<div
			aria-valuetext={selectedOption}
			className={cn("relative flex flex-row justify-between gap-4", className, {
				"items-baseline": !isSelectVisible
			})}
			id={id}
		>
			<label className={cn(className, { "mt-2": isSelectVisible })} htmlFor={id}>
				{label}
			</label>
			<div ref={selectRef}>
				<>
					<button
						className={cn(
							"flex h-fit w-40 items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-black focus:outline-none dark:multi-['border-gray-700;bg-[#23272a];text-white']",
							disabledButtonClasses
						)}
						disabled={loading || disabled}
						key={selectedOption}
						onClick={toggleSelect}
						type="button"
					>
						{loading ?
							<Loader className={"size-4"} />
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
						<div
							className="z-10 mt-2 max-h-60 w-40 overflow-x-hidden 
						overflow-y-scroll rounded-md border border-gray-300 bg-white shadow-lg dark:multi-['border-gray-700;bg-[#23272a]']"
						>
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
