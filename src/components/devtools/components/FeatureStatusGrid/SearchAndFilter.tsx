import type { JSX } from "react";

import type { FilterType } from "./types";

type SearchAndFilterProps = {
	disabledCount: number;
	enabledCount: number;
	filter: FilterType;
	onFilterChange: (filter: FilterType) => void;
	onSearchChange: (term: string) => void;
	searchTerm: string;
	totalCount: number;
};

export default function SearchAndFilter({
	disabledCount,
	enabledCount,
	filter,
	onFilterChange,
	onSearchChange,
	searchTerm,
	totalCount
}: SearchAndFilterProps): JSX.Element {
	return (
		<div className="flex items-center gap-4">
			<input
				className="placeholder:[#6b6b6b] flex-1 rounded border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-2 text-sm text-[#d4d4d4] focus:border-[#007acc] focus:outline-none"
				onChange={(e) => onSearchChange(e.target.value)}
				placeholder="Search features..."
				type="text"
				value={searchTerm}
			/>
			<select
				className="rounded border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-2 text-sm text-[#d4d4d4] focus:border-[#007acc] focus:outline-none"
				onChange={(e) => onFilterChange(e.target.value as FilterType)}
				value={filter}
			>
				<option value="all">All ({totalCount})</option>
				<option value="enabled">Enabled ({enabledCount})</option>
				<option value="disabled">Disabled ({disabledCount})</option>
			</select>
		</div>
	);
}
