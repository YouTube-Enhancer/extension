import { cn } from "@/src/utils/utilities";
import React, { type ChangeEvent } from "react";

export type CheckboxProps = {
	checked: boolean;
	className?: string;
	id?: string;
	label: string;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	title: string;
};

const Checkbox: React.FC<CheckboxProps> = ({ checked, className, id, label, onChange, title }) => {
	return (
		<div className={cn("flex items-center", className)} title={title}>
			<input
				checked={checked}
				className="form-checkbox h-3.5 w-3.5 text-indigo-600 transition duration-150 ease-in-out"
				id={id}
				onChange={onChange}
				type="checkbox"
			/>
			<label className="ml-2 block text-sm text-black dark:text-white" htmlFor={id}>
				{label}
			</label>
		</div>
	);
};

export default Checkbox;
