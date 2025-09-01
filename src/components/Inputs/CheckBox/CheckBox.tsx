import React, { type ChangeEvent, useId } from "react";

import { cn } from "@/src/utils/utilities";

import { useSettings } from "../../Settings/Settings";

export type CheckboxProps = {
	checked: boolean;
	className?: string;
	label: string;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	title: string;
};

const Checkbox: React.FC<CheckboxProps> = ({ checked, className, label, onChange, title }) => {
	const { direction } = useSettings();
	const id = useId();
	return (
		<div className={cn("flex items-center", className)} title={title}>
			<input
				checked={checked}
				className="form-checkbox size-3.5 text-indigo-600 transition duration-150 ease-in-out"
				id={id}
				onChange={onChange}
				type="checkbox"
			/>
			<label className={cn("block text-sm text-black dark:text-white", { "ml-2": direction === "ltr", "mr-2": direction === "rtl" })} htmlFor={id}>
				{label}
			</label>
		</div>
	);
};

export default Checkbox;
