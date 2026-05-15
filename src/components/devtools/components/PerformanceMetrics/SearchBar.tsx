import type { JSX } from "react";

type SearchBarProps = {
	onSearchChange: (term: string) => void;
	searchTerm: string;
};

export default function SearchBar({ onSearchChange, searchTerm }: SearchBarProps): JSX.Element {
	return (
		<input
			className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-2 text-sm text-[#d4d4d4] placeholder:text-[#6b6b6b] focus:border-[#007acc] focus:outline-none"
			onChange={(e) => onSearchChange(e.target.value)}
			placeholder="Search metrics by feature or phase..."
			type="text"
			value={searchTerm}
		/>
	);
}
