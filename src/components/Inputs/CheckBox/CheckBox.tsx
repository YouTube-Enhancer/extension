import React, { type ChangeEvent, useId } from "react";

import { cn } from "@/src/utils/utilities";

import { useSettings } from "../../Settings/Settings";

export type CheckboxProps = {
	checked: boolean;
	className?: string;
	disabled?: boolean;
	disabledReason?: string;
	label: string;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	title: string;
};

const Checkbox: React.FC<CheckboxProps> = ({ checked, className, disabled = false, disabledReason, label, onChange, title }) => {
	const { direction } = useSettings();
	const id = useId();
	return (
		<div className={cn("flex items-start", className)} title={title}>
			<input
				checked={checked}
				className={cn("form-checkbox mt-0.5 size-3.5 text-indigo-600 transition duration-150 ease-in-out", { "!cursor-not-allowed": disabled })}
				disabled={disabled}
				id={id}
				onChange={onChange}
				type="checkbox"
			/>
			<div
				className={cn("min-w-0 max-w-[400px]", {
					"ml-2": direction === "ltr",
					"mr-2": direction === "rtl"
				})}
			>
				<label className="block text-sm text-black dark:text-white" htmlFor={id}>
					{label}
				</label>
				{disabled && disabledReason && (
					<span className="block cursor-default whitespace-normal break-words text-xs leading-tight text-gray-500 dark:text-gray-300">
						{disabledReason}
					</span>
				)}
			</div>
		</div>
	);
};

export default Checkbox;
