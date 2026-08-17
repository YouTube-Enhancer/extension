import React, { useEffect, useId, useRef, useState } from "react";

import type { ChannelSpeedEntry } from "@/src/features/playerSpeed/utils";

import Loader from "@/src/components/Loader";
import { parseChannelSpeeds, serializeChannelSpeeds } from "@/src/features/playerSpeed/utils";
import useDebounceFn from "@/src/hooks/useDebounce";
import { resolveChannelIdFromLink } from "@/src/utils/getChannelId";
import { cn } from "@/src/utils/style";

export type KeyValueListProps = {
	addLabel: string;
	channelIdLabel: string;
	className?: string;
	disabled?: boolean;
	disabledReason?: string;
	getChannelIdFromLinkLabel?: string;
	label: string;
	max: number;
	min: number;
	onChange: (value: string) => void;
	pasteLinkPlaceholder?: string;
	removeLabel: string;
	speedLabel: string;
	step: number;
	title?: string;
	value: string;
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

const KeyValueList: React.FC<KeyValueListProps> = ({
	addLabel,
	channelIdLabel,
	className,
	disabled = false,
	disabledReason,
	getChannelIdFromLinkLabel,
	label,
	max,
	min,
	onChange,
	pasteLinkPlaceholder,
	removeLabel,
	speedLabel,
	step,
	title,
	value = ""
}) => {
	const id = useId();
	const entriesFromValue = (value: string) => Array.from(parseChannelSpeeds(value), ([entryId, speed]) => ({ id: entryId, speed }));
	const [entries, setEntries] = useState<ChannelSpeedEntry[]>(() => entriesFromValue(value));
	const lastEmitted = useRef<string>(value);
	const inputClass =
		"rounded-md border border-gray-300 bg-white p-2 text-black focus:outline-none dark:multi-['border-gray-700;bg-[#23272a];text-white']";
	const buttonClass =
		"rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-black transition-colors hover:bg-gray-100 dark:multi-['border-gray-700;bg-[#23272a];text-white;hover:bg-[#2f3335]']";
	const disabledInputClass = "dark:!text-[#4b5563] !text-[#4b5563] cursor-not-allowed";

	useEffect(() => {
		if (value !== lastEmitted.current) {
			lastEmitted.current = value;
			setEntries(entriesFromValue(value));
		}
	}, [value]);

	const commit = (next: ChannelSpeedEntry[]) => {
		const cleaned = next.map((entry) => ({
			id: entry.id,
			speed: Number.isFinite(entry.speed) ? clamp(entry.speed, min, max) : min
		}));
		lastEmitted.current = serializeChannelSpeeds(cleaned);
		onChange(lastEmitted.current);
	};
	const debouncedCommit = useDebounceFn(commit, 400);

	const handleIdChange = (index: number, nextId: string) => {
		const next = entries.map((entry, i) => (i === index ? { ...entry, id: nextId } : entry));
		setEntries(next);
		debouncedCommit(next);
	};
	const handleSpeedChange = (index: number, speed: number) => {
		const next = entries.map((entry, i) => (i === index ? { ...entry, speed } : entry));
		setEntries(next);
		debouncedCommit(next);
	};
	const handleRemove = (index: number) => {
		const next = entries.filter((_, i) => i !== index);
		setEntries(next);
		commit(next);
	};
	const handleAdd = () => {
		const next = [...entries, { id: "", speed: clamp(1, min, max) }];
		setEntries(next);
		commit(next);
	};

	const addChannelId = (channelId: string) => {
		const existingIndex = entries.findIndex((entry) => entry.id === channelId);
		if (existingIndex !== -1) return;
		const next = [...entries, { id: channelId, speed: clamp(1, min, max) }];
		setEntries(next);
		commit(next);
	};

	const [pasteLinkInput, setPasteLinkInput] = useState("");
	const [isResolvingLink, setIsResolvingLink] = useState(false);
	const handlePasteLink = async () => {
		if (!pasteLinkInput.trim()) return;
		setIsResolvingLink(true);
		try {
			const channelId = await resolveChannelIdFromLink(pasteLinkInput);
			if (channelId) {
				addChannelId(channelId);
				setPasteLinkInput("");
			}
		} finally {
			setIsResolvingLink(false);
		}
	};

	return (
		<div className={cn("relative flex flex-row items-start justify-between gap-4", className)} title={title}>
			<label htmlFor={id}>{label}</label>
			<div className="flex w-72 flex-col gap-2">
				{entries.map((entry, index) => (
					<div className="flex w-full flex-row items-center gap-1" key={index}>
						<input
							aria-label={channelIdLabel}
							className={cn("!m-0 min-w-0 flex-1 !p-2 !text-sm", inputClass, disabled && disabledInputClass)}
							disabled={disabled}
							onChange={(event) => handleIdChange(index, event.currentTarget.value)}
							placeholder={channelIdLabel}
							value={entry.id}
						/>
						<input
							aria-label={speedLabel}
							className={cn("!m-0 w-16 shrink-0 !p-2 !text-sm", inputClass, disabled && disabledInputClass)}
							disabled={disabled}
							max={max}
							min={min}
							onChange={(event) => handleSpeedChange(index, Number(event.currentTarget.value))}
							step={step}
							type="number"
							value={Number.isFinite(entry.speed) ? entry.speed : ""}
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
					<button className={cn(buttonClass, "cursor-pointer", disabled && disabledInputClass)} disabled={disabled} onClick={handleAdd} type="button">
						{"+ "}
						{addLabel}
					</button>
				</div>
				{pasteLinkPlaceholder && (
					<div className="flex w-full flex-row items-center gap-1">
						<input
							aria-label={pasteLinkPlaceholder}
							className={cn("!m-0 min-w-0 flex-1 !p-2 !text-sm", inputClass, disabled && disabledInputClass)}
							disabled={disabled || isResolvingLink}
							onChange={(event) => setPasteLinkInput(event.currentTarget.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") void handlePasteLink();
							}}
							placeholder={pasteLinkPlaceholder}
							value={pasteLinkInput}
						/>
						{getChannelIdFromLinkLabel && (
							<button
								aria-label={getChannelIdFromLinkLabel}
								className={cn(buttonClass, "shrink-0 cursor-pointer", disabled && disabledInputClass)}
								disabled={disabled || isResolvingLink}
								onClick={() => void handlePasteLink()}
								title={getChannelIdFromLinkLabel}
								type="button"
							>
								{isResolvingLink ?
									<Loader className="size-4" />
								:	getChannelIdFromLinkLabel}
							</button>
						)}
					</div>
				)}
				{disabled && disabledReason && (
					<span className="cursor-default whitespace-normal break-words text-xs leading-tight text-gray-500 dark:text-gray-300">
						{disabledReason}
					</span>
				)}
			</div>
		</div>
	);
};

export default KeyValueList;
