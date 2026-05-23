import React, { type ChangeEvent, useId } from "react";

import { cn } from "@/src/utils/style";

import { useSettings } from "../../Settings/Settings";

export type SwitchProps = {
	checked: boolean;
	className?: string;
	disabled?: boolean;
	disabledReason?: string;
	label: string;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	title: string;
};

const Switch: React.FC<SwitchProps> = ({ checked, className, disabled = false, disabledReason, label, onChange, title }) => {
	const { direction } = useSettings();
	const id = useId();
	return (
		<div className={cn("flex items-start", className)} title={title}>
			<div className="relative mt-0.5 shrink-0">
				<input checked={checked} className="peer sr-only" disabled={disabled} id={id} onChange={onChange} type="checkbox" />
				<label
					className={cn(
						"flex h-5 w-10 cursor-pointer items-center rounded-full px-0.5 transition-colors duration-200 ease-in-out",
						"bg-gray-300 peer-checked:bg-[var(--accent)] dark:bg-gray-600 dark:peer-checked:bg-[var(--accent)]",
						{ "!cursor-not-allowed opacity-50": disabled }
					)}
					htmlFor={id}
				>
					<span
						className={cn(
							"block size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
							checked ? "translate-x-5" : "translate-x-0"
						)}
					/>
				</label>
			</div>
			<div
				className={cn("min-w-0 max-w-[400px]", {
					"ml-2": direction === "ltr",
					"mr-2": direction === "rtl"
				})}
			>
				<label className="block cursor-pointer select-none text-sm text-black dark:text-white" htmlFor={id}>
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

export default Switch;
