import type { ChangeEvent } from "react";

import React, { useEffect, useId, useRef, useState } from "react";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";

import type { Nullable } from "@/src/types";

import useDebounceFn from "@/src/hooks/useDebounce";
import { cn } from "@/src/utils/utilities";

export type TextInputProps = {
	className?: string;
	disabled: boolean;
	input_type: "password" | "text";
	label: string;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	title: string;
	value: string;
};

const TextInput: React.FC<TextInputProps> = ({ className, disabled, input_type, label, onChange, title, value }) => {
	const [showPassword, setShowPassword] = useState(false);
	const inputRef = useRef<Nullable<HTMLInputElement>>(null);
	const id = useId();
	const [localValue, setLocalValue] = useState(value);
	useEffect(() => {
		setLocalValue(value);
	}, [value]);
	const debouncedOnChange = useDebounceFn((event: ChangeEvent<HTMLInputElement>) => {
		onChange(event);
	}, 300);
	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const { currentTarget: input } = event;
		const { selectionEnd = 0, selectionStart = 0 } = input;
		setLocalValue(input.value);
		debouncedOnChange({
			...event,
			currentTarget: { ...input, value: input.value },
			target: { ...input, value: input.value }
		} as ChangeEvent<HTMLInputElement>);
		// Restore cursor position after re-render
		requestAnimationFrame(() => {
			const { current: el } = inputRef;
			if (!el) return;
			if (document.activeElement === el) {
				el.setSelectionRange(selectionStart, selectionEnd);
			}
		});
	};
	const disabledInputClasses = { "dark:!text-[#4b5563] !text-[#4b5563] cursor-not-allowed": disabled };
	const resolvedType = input_type === "password" && showPassword ? "text" : input_type;
	return (
		<div aria-valuetext={localValue} className={cn("relative flex flex-row items-center justify-between gap-4", className)} title={title}>
			<label htmlFor={id}>{label}</label>
			<div
				className="flex w-40 items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-black dark:multi-['border-gray-700;bg-[#23272a];text-white']"
				onClick={() => inputRef.current?.focus()}
			>
				{input_type === "password" && (
					<button
						className={cn("text-black hover:text-black dark:text-white dark:hover:text-white", disabledInputClasses)}
						disabled={disabled}
						onClick={(e) => {
							e.stopPropagation();
							setShowPassword((prev) => !prev);
						}}
						type="button"
					>
						{showPassword ?
							<IoMdEye size={18} />
						:	<IoMdEyeOff size={18} />}
					</button>
				)}
				<input
					className={cn("!m-0 h-fit w-[118px] bg-transparent !p-0 !text-sm focus:outline-none", disabledInputClasses)}
					disabled={disabled}
					id={id}
					onChange={handleInputChange}
					ref={inputRef}
					type={resolvedType}
					value={localValue}
				/>
			</div>
		</div>
	);
};

export default TextInput;
