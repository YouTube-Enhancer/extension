import type { Nullable } from "@/src/types";
import type { ChangeEvent } from "react";

import { cn } from "@/src/utils/utilities";
import React, { useRef, useState } from "react";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";

export type TextInputProps = {
	className?: string;
	id: string;
	input_type: "password" | "text";
	label: string;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	title: string;
	value: string;
};

const TextInput: React.FC<TextInputProps> = ({ className, id, input_type, label, onChange, title, value }) => {
	const [showPassword, setShowPassword] = useState(false);
	const inputRef = useRef<Nullable<HTMLInputElement>>(null);
	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const { currentTarget: input } = event;
		const { selectionStart: cursorPosition } = input;
		onChange(event);
		// Restore cursor position after re-render
		requestAnimationFrame(() => {
			if (inputRef.current && cursorPosition !== null) {
				inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
			}
		});
	};
	const handleInputWrapperClick = () => {
		inputRef.current?.focus();
	};
	return (
		<div aria-valuetext={value} className={cn("relative flex flex-row items-center justify-between gap-4", className)} id={id} title={title}>
			<label htmlFor={id}>{label}</label>
			<div
				className="flex w-40 items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-black dark:multi-['border-gray-700;bg-[#23272a];text-white']"
				onClick={handleInputWrapperClick}
			>
				{input_type === "password" && (
					<button
						className="text-black hover:text-black dark:text-white dark:hover:text-white"
						onClick={() => setShowPassword(!showPassword)}
						type="button"
					>
						{showPassword ?
							<IoMdEye size={18} />
						:	<IoMdEyeOff size={18} />}
					</button>
				)}
				<input
					className="!m-0 h-fit w-[118px] bg-transparent !p-0 !text-sm focus:outline-none"
					id={id}
					onChange={handleInputChange}
					ref={inputRef}
					type={showPassword && input_type === "password" ? "text" : input_type}
					value={value}
				/>
			</div>
		</div>
	);
};

export default TextInput;
