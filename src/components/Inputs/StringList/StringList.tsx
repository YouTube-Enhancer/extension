import React, { useEffect, useId, useRef, useState } from "react";

import { parseLineList, serializeLineList } from "@/src/utils/string";
import { cn } from "@/src/utils/style";

export type StringListProps = {
	addLabel: string;
	className?: string;
	disabled?: boolean;
	disabledReason?: string;
	itemLabel: string;
	label: string;
	max?: number;
	onChange: (value: string) => void;
	removeLabel: string;
	title?: string;
	value: string;
};

const StringList: React.FC<StringListProps> = ({
	addLabel,
	className,
	disabled = false,
	disabledReason,
	itemLabel,
	label,
	max,
	onChange,
	removeLabel,
	title,
	value = ""
}) => {
	const labelId = useId();
	const itemsFromValue = (currentValue: string) => {
		const parsed = parseLineList(currentValue);
		return max === undefined ? parsed : parsed.slice(0, max);
	};
	const [items, setItems] = useState<string[]>(() => itemsFromValue(value));
	const lastEmitted = useRef<string>(value);
	const inputClass =
		"rounded-md border border-gray-300 bg-white p-2 text-black focus:outline-none dark:multi-['border-gray-700;bg-[#23272a];text-white']";
	const buttonClass =
		"rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-black transition-colors hover:bg-gray-100 dark:multi-['border-gray-700;bg-[#23272a];text-white;hover:bg-[#2f3335]']";
	const disabledInputClass = "dark:!text-[#4b5563] !text-[#4b5563] cursor-not-allowed";
	const { length: filledCount } = items.filter((item) => item.trim().length > 0);
	const hasBlankRow = filledCount < items.length;
	const atMax = max !== undefined && filledCount >= max;
	const addDisabled = disabled || atMax || hasBlankRow;

	useEffect(() => {
		if (value !== lastEmitted.current) {
			lastEmitted.current = value;
			setItems(itemsFromValue(value));
		}
	}, [value]);

	// Commits synchronously, like the other settings inputs, so nothing is lost when the
	// settings surface closes and no stale write can overtake a newer one.
	const commit = (next: string[]) => {
		const cleaned = next.map((item) => item.trim()).filter((item) => item.length > 0);
		if (max !== undefined && cleaned.length > max) {
			cleaned.splice(max);
			setItems(cleaned);
		} else {
			setItems(next);
		}
		lastEmitted.current = serializeLineList(cleaned);
		onChange(lastEmitted.current);
	};
	const handleChange = (index: number, nextItem: string) => {
		commit(items.map((item, i) => (i === index ? nextItem : item)));
	};
	const handleRemove = (index: number) => {
		commit(items.filter((_, i) => i !== index));
	};
	const handleAdd = () => {
		if (addDisabled) return;
		commit([...items, ""]);
	};

	return (
		<div className={cn("relative flex flex-row items-start justify-between gap-4", className)} title={title}>
			<label id={labelId}>{label}</label>
			<div aria-labelledby={labelId} className="flex w-72 flex-col gap-2" role="group">
				{items.map((item, index) => (
					<div className="flex w-full flex-row items-center gap-1" key={index}>
						<input
							aria-label={itemLabel}
							className={cn("!m-0 min-w-0 flex-1 !p-2 !text-sm", inputClass, disabled && disabledInputClass)}
							disabled={disabled}
							onChange={(event) => handleChange(index, event.currentTarget.value)}
							placeholder={itemLabel}
							value={item}
						/>
						<button
							aria-label={removeLabel}
							className={cn(
								"shrink-0 cursor-pointer text-black hover:text-red-600 dark:text-white dark:hover:text-red-500",
								disabled && disabledInputClass
							)}
							disabled={disabled}
							onClick={() => handleRemove(index)}
							title={removeLabel}
							type="button"
						>
							{"✕"}
						</button>
					</div>
				))}
				<div className="flex flex-row items-center gap-2">
					<button
						className={cn(buttonClass, addDisabled ? disabledInputClass : "cursor-pointer")}
						disabled={addDisabled}
						onClick={handleAdd}
						type="button"
					>
						{"+ "}
						{addLabel}
					</button>
				</div>
				{disabled && disabledReason && (
					<span className="cursor-default whitespace-normal break-words text-xs leading-tight text-gray-500 dark:text-gray-300">
						{disabledReason}
					</span>
				)}
			</div>
		</div>
	);
};

export default StringList;
