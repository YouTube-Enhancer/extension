import type { ChangeEvent } from "react";

import React, { useEffect, useId, useRef, useState } from "react";

import type { Nullable } from "@/src/types";

import useDebounceFn from "@/src/hooks/useDebounce";
import { extractInvalidPlaceholders, screenshotFilenamePlaceholders } from "@/src/utils/format/filenameTemplate";
import { cn } from "@/src/utils/style";

export type FileNameTemplateProps = {
	className?: string;
	disabled: boolean;
	disabledReason?: string;
	error: string;
	hint: string;
	label: string;
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	placeholdersLabel: string;
	title: string;
	value: string;
};

const FileNameTemplate: React.FC<FileNameTemplateProps> = ({
	className,
	disabled,
	disabledReason,
	error,
	hint,
	label,
	onChange,
	placeholdersLabel,
	title,
	value
}) => {
	const inputRef = useRef<Nullable<HTMLInputElement>>(null);
	const localValueRef = useRef(value);
	const id = useId();
	const [localValue, setLocalValue] = useState(value);
	const [invalidPlaceholders, setInvalidPlaceholders] = useState<string[]>(() => extractInvalidPlaceholders(value));
	const syncLocalValue = (nextValue: string) => {
		localValueRef.current = nextValue;
		setLocalValue(nextValue);
	};
	// Sync with external changes (e.g. settings reset) without clobbering in-progress edits
	useEffect(() => {
		syncLocalValue(value);
		setInvalidPlaceholders(extractInvalidPlaceholders(value));
	}, [value]);
	const handlePersist = (inputValue: string) => {
		// Discard stale saves: only persist if the input still shows the value being saved
		if (localValueRef.current !== inputValue) return;
		// Persist the template as typed so in-progress (even invalid) edits are preserved
		onChange({ currentTarget: { value: inputValue } } as ChangeEvent<HTMLInputElement>);
	};
	const debouncedPersist = useDebounceFn(handlePersist, 300);
	// Validation only surfaces once the user pauses, not on every keystroke
	const validateDebounced = useDebounceFn((inputValue: string) => {
		// Discard stale validation after newer edits or external resets
		if (localValueRef.current !== inputValue) return;
		setInvalidPlaceholders(extractInvalidPlaceholders(inputValue));
	}, 300);
	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const { currentTarget: input } = event;
		const { selectionEnd = 0, selectionStart = 0, value: inputValue } = input;
		syncLocalValue(inputValue);
		validateDebounced(inputValue);
		debouncedPersist(inputValue);
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
	return (
		<div className={cn("relative flex flex-col", className)} title={title}>
			<div className="flex flex-row items-baseline justify-between gap-4">
				<label className="mb-1" htmlFor={id}>
					{label}
				</label>
				<input
					aria-invalid={!disabled && invalidPlaceholders.length > 0}
					className={cn(
						"h-10 w-40 rounded-md border border-gray-300 bg-white p-2 text-black focus:outline-none dark:multi-['border-gray-700;bg-[#23272a];text-white']",
						disabledInputClasses
					)}
					disabled={disabled}
					id={id}
					onChange={handleInputChange}
					ref={inputRef}
					type="text"
					value={localValue}
				/>
			</div>
			{disabled && disabledReason && (
				<span className="mt-1 cursor-default whitespace-normal break-words text-xs leading-tight text-gray-500 dark:text-gray-300">
					{disabledReason}
				</span>
			)}
			{!disabled && invalidPlaceholders.length > 0 && (
				<span className="mt-1 cursor-default whitespace-normal break-words text-xs leading-tight text-red-500">
					{error} {invalidPlaceholders.join(", ")}
				</span>
			)}
			<span className="mt-1 cursor-default whitespace-normal break-words text-xs leading-tight text-gray-500 dark:text-gray-300">{hint}</span>
			<span className="mt-1 cursor-default whitespace-normal break-words text-xs leading-tight text-gray-500 dark:text-gray-300">
				{placeholdersLabel}
			</span>
			<span className="cursor-default whitespace-normal break-words font-mono text-xs leading-tight text-gray-500 dark:text-gray-300">
				{screenshotFilenamePlaceholders.join(" ")}
			</span>
		</div>
	);
};

export default FileNameTemplate;
